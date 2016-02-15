/*jshint -W003, -W097, -W117, -W026 */
'use strict';

var db = require('./etl-db');
var _ = require('underscore');
var reportFactory = require('./etl-factory');
var Boom = require('boom'); //extends Hapi Error Reporting. Returns HTTP-friendly error objects: github.com/hapijs/boom
var helpers = require('./etl-helpers');
module.exports = function() {
  return {
    getClinicEncounterData: function getClinicEncounterData(request, callback) {
      var uuid = request.params.uuid;
      var order =  helpers.getSortOrder(request.query.order);
      var filters = {
        s: ""
      };
      if (request.query.filters)
        filters = helpers.getFilters(JSON.parse(request.query.filters));
      var where = ["t1.location_uuid = ?", uuid];
      if (filters.s !== "") {
        where[0] += " AND " + filters.s;
        where = where.concat(filters.vals);
      }
      console.log(where);

      var queryParts = {
        columns: request.query.fields || "t1.*,t2.gender,round(datediff(t1.encounter_datetime,t2.birthdate)/365) as age,group_concat(identifier) as identifiers",
        table: "etl.flat_hiv_summary",
        joins: [
          ['amrs.person', 't2', 't1.person_id = t2.person_id'],
          ['amrs.patient_identifier', 't3', 't1.person_id=t3.patient_id']
        ],
        where: where,
        group: ['person_id', 'encounter_id'],
        order: order || [{
          column: 'encounter_datetime',
          asc: false
        }],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        _.each(result.result, function(row) {
          row.cur_arv_meds = helpers.getARVNames(row.cur_arv_meds);
          row.arv_first_regimen = helpers.getARVNames(row.arv_first_regimen);
        });
        callback(result);
      });
    },
    getPatientHivSummary: function getPatientHivSummary(request, callback) {
      var uuid = request.params.uuid;
      var order = helpers.getSortOrder(request.query.order);

      var queryParts = {
        columns: request.query.fields || "*",
        table: "etl.flat_hiv_summary",
        where: ["uuid = ?", uuid],
        order: order || [{
          column: 'encounter_datetime',
          asc: false
        }],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        _.each(result.result, function(row) {
          row.cur_arv_meds = helpers.getARVNames(row.cur_arv_meds);
          row.arv_first_regimen = helpers.getARVNames(row.arv_first_regimen);
        });
        callback(result);
      });
    },
    getClinicHivSummayIndicators: function getClinicHivSummayIndicators(request, callback) {
      var uuid = request.params.uuid;
      var order =  helpers.getSortOrder(request.query.order);

      var query = "";

      var queryParts = {
        columns: request.query.fields || "*",
        table: "etl.hiv_summary_indicators",
        where: ["location = ?", uuid],
        order: order || [{
          column: 'encounter_datetime',
          asc: false
        }],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });
    },
    getClinicAppointmentSchedule: function getClinicAppointmentSchedule(request, callback) {
      var uuid = request.params.uuid;
      var order =  helpers.getSortOrder(request.query.order);
      var startDate = request.query.startDate || new Date().toISOString().substring(0, 10);
      var endDate = request.query.endDate || new Date().toISOString().substring(0, 10);

      var queryParts = {
        columns: request.query.fields || "t1.*,t3.given_name,t3.middle_name,t3.family_name,group_concat(identifier) as identifiers",
        table: "etl.flat_hiv_summary",
        joins: [
          ['etl.derived_encounter', 't2', 't1.encounter_id = t2.encounter_id'],
          ['amrs.person_name', 't3', 't1.person_id = t3.person_id'],
          ['amrs.patient_identifier', 't4', 't1.person_id=t4.patient_id']
        ],
        where: ["t1.location_uuid = ? and date(rtc_date) >= ? and date(rtc_date) <= ?", uuid, startDate, endDate],
        group: ['person_id'],
        order: order || [{
          column: 'family_name',
          asc: true
        }],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });

    },
    getClinicDailyVisits: function getClinicDailyVisits(request, callback) {
      var uuid = request.params.uuid;
      var order =  helpers.getSortOrder(request.query.order);
      var startDate = request.query.startDate || new Date().toISOString().substring(0, 10);
      var endDate = request.query.endDate || new Date().toISOString().substring(0, 10);

      var queryParts = {
        columns: request.query.fields || "t1.*,t3.given_name,t3.middle_name,t3.family_name,group_concat(identifier) as identifiers",
        table: "etl.flat_hiv_summary",
        joins: [
          ['etl.derived_encounter', 't2', 't1.encounter_id = t2.encounter_id'],
          ['amrs.person_name', 't3', 't1.person_id = t3.person_id'],
          ['amrs.patient_identifier', 't4', 't1.person_id=t4.patient_id']
        ],
        where: ["t1.location_uuid = ? and date(encounter_datetime) >= ? and date(encounter_datetime) <= ?", uuid, startDate, endDate],
        group: ['person_id'],
        order: order || [{
          column: 'family_name',
          asc: true
        }],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });

    },
    getHasNotReturned: function getHasNotReturned(request, callback) {
      var uuid = request.params.uuid;
      var order =  helpers.getSortOrder(request.query.order);
      var startDate = request.query.startDate || new Date().toISOString().substring(0, 10);
      var endDate = request.query.endDate || new Date().toISOString().substring(0, 10);

      var queryParts = {
        columns: request.query.fields || "t1.*,t3.given_name,t3.middle_name,t3.family_name,group_concat(identifier) as identifiers",
        table: "etl.flat_hiv_summary",
        joins: [
          ['etl.derived_encounter', 't2', 't1.encounter_id = t2.encounter_id'],
          ['amrs.person_name', 't3', 't1.person_id = t3.person_id'],
          ['amrs.patient_identifier', 't4', 't1.person_id=t4.patient_id']
        ],
        where: ["t1.location_uuid = ? and t1.rtc_date between ? and ? and next_clinic_datetime is null",
          uuid, startDate, endDate
        ],
        group: ['person_id'],
        order: order || [{
          column: 'family_name',
          asc: true
        }],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });

    },
    getClinicMonthlyAppointmentSchedule: function getClinicMonthlyAppointmentSchedule(request, callback) {
      var uuid = request.params.uuid;
      var order =  helpers.getSortOrder(request.query.order);
      var startDate = request.query.startDate || new Date().toISOString().substring(0, 10);

      var queryParts = {
        columns: request.query.fields || ["date(rtc_date) as rtc_date", "date_format(rtc_date,'%W') as day_of_week", "count( distinct t1.person_id) as total"],
        table: "etl.flat_hiv_summary",
        where: ["t1.location_uuid = ? and date_format(rtc_date,'%Y-%m') = date_format(?,'%Y-%m')", uuid, startDate],
        group: ['rtc_date'],
        order: order || [{
          column: 'rtc_date',
          asc: true
        }],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });
    },
    getClinicMonthlySummary: function getClinicMonthlySummary(request, callback) {
      var uuid = request.params.uuid;
      var order =  helpers.getSortOrder(request.query.order);
      var startDate = request.query.startDate || new Date().toISOString().substring(0, 10);
      var endDate = request.query.endDate || new Date().toISOString().substring(0, 10);

      var queryParts = {};
      queryParts.values = [uuid, startDate, endDate, uuid, startDate, endDate];
      queryParts.startDate = startDate;
      var sql = "SELECT d AS rtc_date," +
        "       date_format(d,'%W') AS day_of_week," +
        "       SUM(CASE WHEN description = 'schedule' THEN total_scheduled ELSE 0 END) AS total_visited," +
        "       SUM(CASE WHEN description = 'encounter' THEN total_scheduled ELSE 0 END) AS total," +
        "       (CASE WHEN CURDATE() > d THEN scheduled_and_attended ELSE 0 END) as scheduled_and_attended," +
        "       (CASE WHEN CURDATE() >  d THEN has_not_returned ELSE 0 END) as has_not_returned from" +
        "  (SELECT date(rtc_date) AS d, 'schedule' AS description, date_format(rtc_date,'%W') AS day_of_week, count(DISTINCT t1.person_id) AS total_scheduled,location_id, count(DISTINCT if(next_clinic_datetime IS NOT NULL,t1.person_id,NULL)) AS scheduled_and_attended, count(DISTINCT if(next_clinic_datetime IS NULL,t1.person_id,NULL)) AS has_not_returned" +
        "   FROM etl.flat_hiv_summary t1" +
        "   JOIN etl.derived_encounter t2 USING (encounter_id)" +
        "   WHERE t1.location_uuid = ?" +
        "     AND rtc_date BETWEEN ? AND ?  GROUP BY d" +
        "   UNION SELECT date(encounter_datetime) AS d, 'encounter' AS description, date_format(encounter_datetime,'%W') AS day_of_week, count(DISTINCT t1.person_id) AS total_visits,location_id, count(DISTINCT if(next_clinic_datetime IS NOT NULL,t1.person_id,NULL)) AS scheduled_and_attended, count(DISTINCT if(next_clinic_datetime IS NULL,t1.person_id,NULL)) AS has_not_returned" +
        "   FROM etl.flat_hiv_summary t1" +
        "   JOIN etl.derived_encounter t2 USING (encounter_id)" +
        "   WHERE t1.location_uuid = ? " +
        "     AND encounter_datetime BETWEEN ? AND ?" +
        "   GROUP BY d) AS a GROUP BY d;";
      queryParts.sql = sql;
      db.queryServer(queryParts, function(result) {
        callback(result);
      });
    },
    getClinicMonthlyVisits: function getClinicMonthlyVisits(request, callback) {
      var uuid = request.params.uuid;
      var order =  helpers.getSortOrder(request.query.order);
      var startDate = request.query.startDate || new Date().toISOString().substring(0, 10);

      var queryParts = {
        columns: request.query.fields || ["date(encounter_datetime) as visit_date", "date_format(encounter_datetime,'%W') as day_of_week", "count( distinct t1.person_id) as total"],
        table: "etl.flat_hiv_summary",
        where: ["t1.location_uuid = ? and date_format(encounter_datetime,'%Y-%m') = date_format(?,'%Y-%m')", uuid, startDate],
        group: ['encounter_datetime'],
        order: order || [{
          column: 'encounter_datetime',
          asc: true
        }],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });
    },
    getClinicDefaulterList: function getClinicDefaulterList(request, callback) {
      var uuid = request.params.uuid;
      var order =  helpers.getSortOrder(request.query.order);

      var defaulterPeriod = request.query.defaulterPeriod || 30;

      var queryParts = {
        columns: request.query.fields || "*",
        table: "etl.flat_defaulters",
        where: ["location_uuid = ? and days_since_rtc >= ?", uuid, defaulterPeriod],
        order: order || [{
          column: 'days_since_rtc',
          asc: true
        }],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });
    },
    getCustomData: function getCustomData(request, callback) {

      var passed_params = request.params.userParams.split('/');
      var table_ = "amrs." + passed_params[0];
      var column_name = passed_params[1];
      var column_value = passed_params[2];

      console.log('Gettting Here');
      var uuid = request.params.uuid;
      var order =  helpers.getSortOrder(request.query.order);

      var queryParts = {
        columns: request.query.fields || "*",
        table: table_,
        where: [column_name + " = ?", column_value],
        // order: order || [{column:'encounter_datetime',asc:false}],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });
    },
    getPatientVitals: function getPatientVitals(request, callback) {
      var uuid = request.params.uuid;
      var order =  helpers.getSortOrder(request.query.order);
      console.log('test  ', request.query);
      // request.query.page;
      // request.query.pageSize;

      var queryParts = {
        columns: request.query.fields || "*",
        table: "etl.flat_vitals",
        where: ["uuid = ?", uuid],
        order: order || [{
          column: 'encounter_datetime',
          asc: false
        }],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });

    },
    getPatientData: function getPatientData(request, callback) {
      var uuid = request.params.uuid;
      var order =  helpers.getSortOrder(request.query.order);

      var queryParts = {
        columns: request.query.fields || "*",
        table: "etl.flat_labs_and_imaging",
        where: ["uuid = ?", uuid],
        order: order || [{
          column: 'encounter_datetime',
          asc: false
        }],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });
    },
    getPatient: function getPatient(request, callback) {
      console.log('Gettting Here', request.query);
      var uuid = request.params.uuid;
      var order =  helpers.getSortOrder(request.query.order);

      var queryParts = {
        columns: request.query.fields || "*",
        table: "etl.flat_hiv_summary",
        where: ["uuid = ?", uuid],
        order: order || [{
          column: 'encounter_datetime',
          asc: false
        }],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });
    },
    getPatientCountGroupedByLocation: function getPatientStgetPatientCountGroupedByLocationatics(request, callback) {
      var periodFrom = request.query.startDate || new Date().toISOString().substring(0, 10);
      var periodTo = request.query.endDate || new Date().toISOString().substring(0, 10);
      var order =  helpers.getSortOrder(request.query.order);

      var queryParts = {
        columns: "t3.location_id,t3.name,count( distinct t1.patient_id) as total",
        table: "amrs.patient",
        where: ["date_format(t1.date_created,'%Y-%m-%d') between date_format(?,'%Y-%m-%d') AND date_format(?,'%Y-%m-%d')", periodFrom, periodTo],
        group: ['t3.uuid,t3.name'],
        order: order || [{
          column: 't2.location_id',
          asc: false
        }],
        joins: [
          ['amrs.encounter', 't2', 't1.patient_id = t2.patient_id'],
          ['amrs.location', 't3', 't2.location_id=t3.location_id'],
          ['amrs.person_name', 't4', 't4.person_id=t1.patient_id']
        ],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });
    },
    getPatientDetailsGroupedByLocation: function getPatientDetailsGroupedByLocation(request, callback) {
      var location = request.params.location;
      var periodFrom = request.query.startDate || new Date().toISOString().substring(0, 10);
      var periodTo = request.query.endDate || new Date().toISOString().substring(0, 10);
      var order =  helpers.getSortOrder(request.query.order);
      var queryParts = {
        columns: "distinct t4.uuid as patientUuid, t1.patient_id, t3.given_name, t3.middle_name, t3.family_name",
        table: "amrs.patient",
        where: ["t2.location_id = ? AND date_format(t1.date_created,'%Y-%m-%d') between date_format(?,'%Y-%m-%d') AND date_format(?,'%Y-%m-%d')", location, periodFrom, periodTo],
        order: order || [{
          column: 't2.location_id',
          asc: false
        }],
        joins: [
          ['amrs.encounter', 't2', 't1.patient_id = t2.patient_id'],
          ['amrs.person_name', 't3', 't3.person_id=t1.patient_id'],
          ['amrs.person', 't4', 't4.person_id=t1.patient_id']

        ],
        offset: request.query.startIndex,
        limit: request.query.limit
      };

      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });
    },
    getReportIndicators: function getReportIndicators(request, callback) {
      console.log('Getting Here', request.query);
      var reportName = request.query.report;
      var countBy = request.query.countBy;
      var startDate = request.query.startDate || new Date().toISOString().substring(0, 10);
      var endDate = request.query.endDate || new Date().toISOString().substring(0, 10);
      var order = helpers.getSortOrder(request.query.order);
      var locations;
      if (request.query.locations) {
        locations = [];
        _.each(request.query.locations.split(','), function(loc) {
          locations.push(Number(loc));
        });
      }
      var requestIndicators = request.query.indicators;
      //build query params
      var requestParams = {
        reportName: reportName,
        whereParams: [{
          "name": "startDate",
          "value": startDate
        }, {
          "name": "endDate",
          "value": endDate
        }, {
          "name": "locations",
          "value": locations
        }],
        order: order || [{
          column: 't1.location_id',
          asc: true
        }],
        countBy: countBy || 'num_persons',
        groupBy: request.query.groupBy || 'groupByLocation',
        offset: request.query.startIndex,
        limit: request.query.limit,
        requestIndicators: requestIndicators
      };
      //build report
      var queryParts =reportFactory.singleReportToSql(requestParams);

      db.reportQueryServer(queryParts, function(results) {
        callback(reportFactory.resolveIndicators(reportName, results));
      });
    },
    getDataEntryIndicators: function getDataEntryIndicators(subType, request, callback) {
      var reportName = 'data-entry-statistic-report';
      var startDate = request.query.startDate || new Date().toISOString().substring(0, 10);
      var endDate = request.query.endDate || new Date().toISOString().substring(0, 10);
      var queryParams = {
        reportName: reportName,
        countBy: 'encounter', //this gives the ability to count by either person_id or encounter_id,
        locations: request.query.locationIds,
        provideruuid: request.query.providerUuid,
        encounterTypeIds: request.query.encounterTypeIds,
        creatoruuid: request.query.creatorUuid,
        formIds: request.query.formIds
      };
      var columns;
      var groupBy;
      var orderBy = [];
      var joins = [
        ['amrs.encounter', 't2', 't1.encounter_id = t2.encounter_id'],
        ['amrs.encounter_type', 't3', 't3.encounter_type_id = t2.encounter_type']
      ];
      var where = ["encounter_datetime >= ? and encounter_datetime <= ?", startDate, endDate];

      helpers.buildWhereClauseForDataEntryIndicators(queryParams, where);

      switch (subType) {
        case 'by-date-by-encounter-type':
          columns = ["date(encounter_datetime) as date, t2.encounter_type as encounter_type_id, " +
            "t3.name as encounter_type, count(*) as encounters_count"
          ];
          groupBy = ['date', 'encounter_type_id'];
          joins.push(['amrs.provider', 't4', 't4.provider_id = t1.provider_id']);
          break;
        case 'by-month-by-encounter-type':
          columns = ["year(encounter_datetime) as year, month(encounter_datetime)  as month_number, " +
            "DATE_FORMAT(encounter_datetime, '%M, %Y') as month, t2.encounter_type as encounter_type_id," +
            " t3.name as encounter_type, count(*) as encounters_count"
          ];
          groupBy = ['month', 'encounter_type_id'];
          joins.push(['amrs.provider', 't4', 't4.provider_id = t1.provider_id']);
          orderBy = [{
            column: 'year',
            asc: true
          }, {
            column: 'month_number',
            asc: true
          }];
          break;
        case 'by-provider-by-encounter-type':
          columns = ["t4.provider_id as provider_id, t4.uuid as provider_uuid, t2.encounter_type as " +
            "encounter_type_id, t3.name as encounter_type, count(*) as encounters_count"
          ];
          groupBy = ['provider_id', 'encounter_type_id'];
          joins.push(['amrs.provider', 't4', 't4.provider_id = t1.provider_id']);
          break;
        case 'by-creator-by-encounter-type':
          columns = ["t5.user_id as creator_id, t5.uuid as user_uuid, t2.encounter_type as encounter_type_id," +
            " t3.name as encounter_type, count(*) as encounters_count"
          ];
          groupBy = ['creator_id', 'encounter_type_id'];
          joins.push(['amrs.users', 't5', 't2.creator = t5.user_id']);
          break;
      }

      var queryParts = {
        columns: columns,
        table: "amrs.encounter_provider",
        where: where,
        joins: joins,
        group: groupBy,
        order: orderBy
      };
      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });

    },
    getPatientListByIndicator: function getPatientListByIndicator(request, callback) {
      console.log('Getting Here', request.query);
      var reportIndicator = request.query.indicator;
      var location = request.params.location;
      var startDate = request.query.startDate || new Date().toISOString().substring(0, 10);
      var endDate = request.query.endDate || new Date().toISOString().substring(0, 10);
      var order =  helpers.getSortOrder(request.query.order);
      var reportName = request.query.reportName || 'hiv-summary-report';
      //Check for undefined query field
      if (reportIndicator === undefined)
        callback(Boom.badRequest('indicator (Report Indicator) is missing from your request query'));
      //declare query params
      var queryParams = {
        reportIndicator: reportIndicator,
        reportName: reportName
      };
      //build report
      reportFactory.buildPatientListExpression(queryParams, function(exprResult) {
        var queryParts = {
          columns: "t1.person_id,t1.encounter_id,t1.location_id,t1.location_uuid, t1.uuid as patient_uuid",
          concatColumns: "concat(t2.given_name,' ',t2.middle_name,' ',t2.family_name) as person_name; " +
            "group_concat(distinct t3.identifier separator ', ') as identifiers",
          table: exprResult.resource,
          where: ["t1.encounter_datetime >= ? and t1.encounter_datetime <= ? and t1.location_uuid=? " +
            exprResult.whereClause, startDate, endDate, location
          ],
          joins: [
            ['amrs.person_name', 't2', 't1.person_id = t2.person_id']
          ],
          leftOuterJoins: [
            ['amrs.patient_identifier', 't3', 't1.person_id = t3.patient_id']
          ],
          order: order || [{
            column: 'encounter_datetime',
            asc: false
          }],
          offset: request.query.startIndex,
          limit: request.query.limit,
          group: ['t1.person_id']
        };
        db.queryServer_test(queryParts, function(result) {
          callback(result);
        });
      });
    },
    getPatientByIndicatorAndLocation: function getPatientByIndicator(request, callback) {
      console.log('Getting Here', request.query);
      var reportIndicator = request.query.indicator;
      var startDate = request.query.startDate || new Date().toISOString().substring(0, 10);
      var endDate = request.query.endDate || new Date().toISOString().substring(0, 10);
      var order =  helpers.getSortOrder(request.query.order);
      var reportName = request.query.reportName || 'hiv-summary-report';
      var locationIds = request.query.locations;
      var locations = [];
      _.each(locationIds.split(','), function(loc) {
        locations.push(Number(loc));
      });
      //Check for undefined query field
      if (reportIndicator === undefined)
        callback(Boom.badRequest('indicator (Report Indicator) is missing from your request query'));
      //declare query params
      var queryParams = {
        reportIndicator: reportIndicator,
        reportName: reportName
      };
      //build report
      reportFactory.buildPatientListExpression(queryParams, function(exprResult) {
        var queryParts = {
          columns: "t1.person_id,t1.encounter_id,t1.location_id,t1.location_uuid, t1.uuid as patient_uuid",
          concatColumns: "concat(t2.given_name,' ',t2.middle_name,' ',t2.family_name) as person_name; " +
            "group_concat(distinct t3.identifier separator ', ') as identifiers",
          table: exprResult.resource,
          where: ["t1.encounter_datetime >= ? and t1.encounter_datetime <= ? and t1.location_id in ? " +
            exprResult.whereClause, startDate, endDate, locations
          ],
          joins: [
            ['amrs.person_name', 't2', 't1.person_id = t2.person_id']
          ],
          leftOuterJoins: [
            ['amrs.patient_identifier', 't3', 't1.person_id = t3.patient_id']
          ],
          order: order || [{
            column: 'encounter_datetime',
            asc: false
          }],
          offset: request.query.startIndex,
          limit: request.query.limit,
          group: ['t1.person_id']
        };
        db.queryServer_test(queryParts, function(result) {
          callback(result);
        });
      });
    },
    getIndicatorsSchemaWithSections: function getIndicatorsSchemaWithSections(request, callback) {
      console.log('Getting Here', request.query);
      var reportName = request.query.report;
      //Check for undefined query field
      if (reportName === undefined)
        callback(Boom.badRequest('report (Report Name) is missing from your request query'));
      //build query params
      var queryParams = {
        reportName: reportName
      };
      //retrieve jsin
      reportFactory.buildIndicatorsSchemaWithSections(queryParams, function(result) {
        var schema = {};
        schema.result = result;
        callback(schema);
      });
    },
    getIndicatorsSchema: function getIndicatorsSchema(request, callback) {
      console.log('Getting Here', request.query);
      var reportName = request.query.report;
      //Check for undefined query field
      if (reportName === undefined)
        callback(Boom.badRequest('report (Report Name) is missing from your request query'));
      //build query params
      var queryParams = {
        reportName: reportName
      };
      //retrieve jsin
      reportFactory.buildIndicatorsSchema(queryParams, function(result) {
        var schema = {};
        schema.result = result;
        callback(schema);
      });
    },
    getIdsByUuidAsyc:function getIdsByUuidAsyc(fullTableName, idColumnName, uuidColumnName, arrayOfUuids, callback) {
        var uuids = [];
        _.each(arrayOfUuids.split(','), function(uuid) {
            uuids.push(uuid);
        });

        var queryParts = {
            columns: idColumnName,
            table: fullTableName,
            where: [uuidColumnName + " in ?", uuids]
        };

        var promise = {
            onResolved: undefined,
            results: undefined
        };

        db.queryServer_test(queryParts, function(result) {
            var formattedResult = '';

            _.each(result.result, function(rowPacket) {
                if (formattedResult === '') {
                    formattedResult = formattedResult + rowPacket[idColumnName];
                } else {
                    formattedResult = formattedResult + ',' + rowPacket[idColumnName];
                }
            });
            callback(formattedResult);
            promise.results = formattedResult;
            if (typeof promise.onResolved === 'function') {
                promise.onResolved(promise);
            }
        });

        return promise;
    },
    getHivSummaryData: function getHivSummaryData(request, callback) {
      var startDate = request.query.startDate || new Date().toISOString().substring(0, 10);
      var endDate = request.query.endDate || new Date().toISOString().substring(0, 10);
      var locationUuids = request.query.locationUuids || '';
      var locations = [];
      _.each(locationUuids.split(','), function(loc) {
        locations.push(loc);
      });
      var columns = "name as location, t1.*, day(encounter_datetime) as day, t3.gender, " +
        "week(encounter_datetime) as week, month(encounter_datetime) as month, year(encounter_datetime) as year," +
        "DATE_FORMAT(NOW(), '%Y') - DATE_FORMAT(t3.birthdate, '%Y') - (DATE_FORMAT(NOW(), '00-%m-%d') < " +
        "DATE_FORMAT(t3.birthdate,'00-%m-%d')) AS age, if(arv_start_date is not null, t1.person_id,null) as on_arvs, t2.location_id";
      var queryParts = {
        columns: columns,
        table: "etl.flat_hiv_summary",
        where: ["encounter_datetime >= ? and encounter_datetime <= ? and t1.location_uuid in ?",
          startDate, endDate, locations
        ],
        joins: [
          ['amrs.location', 't2', 't1.location_uuid = t2.uuid'],
          ['amrs.person', 't3', 't3.person_id=t1.person_id']
        ],
        offset: request.query.startIndex,
        limit: request.query.limit
      };
      db.queryServer_test(queryParts, function(result) {
        callback(result);
      });

    }
  };
}();
