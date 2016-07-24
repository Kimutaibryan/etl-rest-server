var Hapi = require('hapi');
var mysql = require('mysql');
var Good = require('good');
var requestConfig = require('./request-config');
var Basic = require('hapi-auth-basic');
var https = require('http');
var config = require('./conf/config');
var requestConfig = require('./request-config');
var corsHeaders = require('hapi-cors-headers');
var _ = require('underscore');
var moment = require('moment');
var tls = require('tls');
var fs = require('fs');
var routes = require('./etl-routes');
var elasticRoutes = require('./elastic/routes/care.treatment.routes');
var Inert = require('inert');
var Vision = require('vision');
var HapiSwagger = require('hapi-swagger');
var Pack = require('./package');
var hapiAuthorization = require('hapi-authorization');
var Nes = require('nes');
var pub = require('redis-connection')();
var sub = require('redis-connection')('subscriber');
var authorizer = require('./authorization/etl-authorizer');
var user = '';
var server = new Hapi.Server({
  connections: {
    //routes: {cors:{origin:["https://amrs.ampath.or.ke:8443"]}}
    routes: {
      cors: {
        additionalHeaders: ['JSNLog-RequestId']
      }
    }
  }
});

var tls_config = false;
if (config.etl.tls) {
  tls_config = tls.createServer({
    key: fs.readFileSync(config.etl.key),
    cert: fs.readFileSync(config.etl.cert)
  });
}

server.connection({
  port: config.etl.port,
  host: config.etl.host,
  tls: tls_config
});
var pool = mysql.createPool(config.mysql);

var validate = function(username, password, callback) {

  //Openmrs context
  var openmrsAppName = config.openmrs.applicationName || 'amrs';
  var options = {
    hostname: config.openmrs.host,
    port: config.openmrs.port,
    path: '/' + openmrsAppName + '/ws/rest/v1/session',
    headers: {
      'Authorization': "Basic " + new Buffer(username + ":" + password).toString("base64")
    }
  };
  if (config.openmrs.https) {
    https = require('https');
  }
  https.get(options, function(res) {
    var body = '';
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      var result = JSON.parse(body);
      user = result.user.username;
      authorizer.setUser(result.user);
      var currentUser = {
        username: username,
        role: authorizer.isSuperUser() ?
          authorizer.getAllPrivilegesArray() : authorizer.getCurrentUserPreviliges()
      };

      //console.log('Logged in user:', currentUser);

      callback(null, result.authenticated, currentUser);

    });
  }).on('error', function(error) {
    //console.log(error);
    callback(null, false);
  });
};

var HapiSwaggerOptions = {
  info: {
    'title': 'REST API Documentation',
    'version': Pack.version,
  },
  tags: [{
    'name': 'patient'
  }, {
    'name': 'location'
  }],
  sortEndpoints: 'path'
};

server.ext('onRequest', function(request, reply) {
  requestConfig.setAuthorization(request.headers.authorization);
  return reply.continue();

});
server.register([
    Inert,
    Vision,
    Nes, {
      'register': HapiSwagger,
      'options': HapiSwaggerOptions
    }, {
      register: Basic,
      options: {}
    }, {
      register: hapiAuthorization,
      options: {
        roles: authorizer.getAllPrivilegesArray()
      }
    }, {
      register: Good,
      options: {
        reporters: []
      }
    }
  ],

  function(err) {
    if (err) {
      throw err; // something bad happened loading the plugin
    }
    server.auth.strategy('simple', 'basic', {
      validateFunc: validate
    });

    //Adding routes
    for (var route in routes) {
      server.route(routes[route]);
    }

    for (var route in elasticRoutes) {
      server.route(elasticRoutes[route]);
    }

    function broadcastHandler(socket) {
      socket.on('broadcast:message', function(msg) {
        console.log("msg:", msg);
        // console.log("message received: " + msg + " );
        var str = JSON.stringify(msg);
        console.log(str);
        pub.RPUSH("broadcast:messages", str); // notification history
        pub.publish("broadcast:messages:latest", str); // latest notification
      });
    }

    function init(listener, callback) {
    // setup redis pub/sub independently of any socket connections
      pub.on("ready", function() {
        // console.log("PUB Ready!");
        sub.on("ready", function() {
          sub.subscribe("broadcast:messages:latest");
          // now start the socket.io
          listener.onConnection(broadcastHandler);
          // Here's where all Redis messages get relayed to Socket.io clients
          sub.on("message", function(channel, message) {
            console.log(channel + " : " + message);
            var msg = JSON.stringify(message);
            server.broadcast(message); // relay to all connected socket clients
          });
          setTimeout(function() {
            callback()
          }, 300); // wait for socket to boot
        });
      });
    }

    server.on('response', function(request) {
      if (request.response === undefined || request.response === null) {
        console.log("No response");
      } else {
        console.log(
          'Username:',
          user + '\n' +
          moment().local().format("YYYY-MM-DD HH:mm:ss") + ': ' + server.info.uri + ': ' + request.method.toUpperCase() + ' ' + request.url.path + ' \n ' + request.response.statusCode
        );

      }

    })


    server.ext('onPreResponse', corsHeaders);
    server.start(function() {
      server.log('info', 'Server running at: ' + server.info.uri);
      init(server.listener, function(){
        // console.log('REDISCLOUD_URL:', process.env.REDISCLOUD_URL);
        server.log('broadcast ready?', 'listening on:' + config.etl.host +':'+ config.etl.port);
      });
    });


  });
module.exports = server;
