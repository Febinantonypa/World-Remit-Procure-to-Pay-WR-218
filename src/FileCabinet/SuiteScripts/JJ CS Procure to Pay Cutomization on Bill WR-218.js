/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/search', 'N/record'],
    /**
     * @param{currentRecord} currentRecord
     * @param{search} search
     * @param{serverWidget} serverWidget
     * @param{record} record
     */
    function (currentRecord, search, record) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {

        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            try {

            } catch (err) {
                console.log("Error @ fieldChanged", err);
            }
        }


        /**
         * @description Check whether the given parameter argument has value on it or is it empty.
         * ie, To check whether a value exists in parameter
         * @param {*} parameter parameter which contains/references some values
         * @param {*} parameterName name of the parameter, not mandatory
         * @returns {Boolean} true if there exist a value, else false
         */
        function checkForParameter(parameter, parameterName) {
            if (parameter !== "" && parameter !== null && parameter !== undefined && parameter !== false && parameter !== "null" && parameter !== "undefined" && parameter !== " " && parameter !== 'false') {
                return true;
            } else {
                if (parameterName)
                    log.debug('Empty Value found', 'Empty Value for parameter ' + parameterName);
                return false;
            }

            const dataSets = {
                /**
                 * @description Object referencing NetSuite Saved Search
                 * @typedef {Object} SearchObj
                 * @property {Object[]} filters - Filters Array in Search
                 * @property {Object[]} columns - Columns Array in Search
                 */
                /**
                 * @description to format Saved Search column to key-value pair where each key represents each columns in Saved Search
                 * @param {SearchObj} savedSearchObj
                 * @param {void|String} priorityKey
                 * @returns {Object.<String,SearchObj.columns>}
                 */
                fetchSavedSearchColumn: function (savedSearchObj, priorityKey) {
                    var columns = savedSearchObj.columns;
                    var columnsData = {},
                        columnName = '';
                    columns.forEach(function (result, counter) {
                        columnName = '';
                        if (result[priorityKey]) {
                            columnName += result[priorityKey];
                        } else {
                            if (result.summary)
                                columnName += result.summary + '__';
                            if (result.formula)
                                columnName += result.formula + '__';
                            if (result.join)
                                columnName += result.join + '__';
                            columnName += result.name;
                        }
                        columnsData[columnName] = result;
                    });
                    return columnsData;
                },
                /**
                 * @description Representing each result in Final Saved Search Format
                 * @typedef formattedEachSearchResult
                 * @type {{value:any,text:any}}
                 */
                /**
                 * @description to fetch and format the single saved search result. ie, Search result of a single row containing both text and value for each columns
                 * @param {Object[]} searchResult contains search result of a single row
                 * @param {Object.<String,SearchObj.columns>} columns
                 * @returns {Object.<String,formattedEachSearchResult>|{}}
                 */
                formatSingleSavedSearchResult: function (searchResult, columns) {
                    var responseObj = {};
                    for (var column in columns)
                        responseObj[column] = {
                            value: searchResult.getValue(columns[column]),
                            text: searchResult.getText(columns[column])
                        };
                    return responseObj;
                },
                /**
                 * @description to iterate over and initiate format of each saved search result
                 * @param {SearchObj} searchObj
                 * @param {void|Object.<String,SearchObj.columns>} columns
                 * @returns {[]|Object[]}
                 */
                iterateSavedSearch: function (searchObj, columns) {
                    if (!checkForParameter(searchObj))
                        return false;
                    if (!checkForParameter(columns))
                        columns = dataSets.fetchSavedSearchColumn(searchObj);

                    var response = [];
                    var searchPageRanges;
                    try {
                        searchPageRanges = searchObj.runPaged({
                            pageSize: 1000
                        });
                    } catch (err) {
                        return [];
                    }
                    if (searchPageRanges.pageRanges.length < 1)
                        return [];

                    var pageRangeLength = searchPageRanges.pageRanges.length;
                    log.debug('pageRangeLength', pageRangeLength);

                    for (var pageIndex = 0; pageIndex < pageRangeLength; pageIndex++)
                        searchPageRanges.fetch({
                            index: pageIndex
                        }).data.forEach(function (result) {
                            response.push(dataSets.formatSingleSavedSearchResult(result, columns));
                        });

                    return response;
                },
                /**
                 *
                 * @param departmentValue of the Vendor Bill
                 * @returns {*[]|Object[]}
                 */
                activeEmployeeForDepartment: function (departmentValue) {
                    var employeeSearchObj = search.create({
                        type: "employee",
                        filters:
                            [
                                ["department", "anyof", departmentValue],
                                "AND",
                                ["access", "is", "T"],
                                "AND",
                                ["isinactive", "is", "F"]
                            ],
                        columns:
                            [
                                search.createColumn({name: "internalid", label: "InternalID"}),
                                search.createColumn({
                                    name: "entityid",
                                    sort: search.Sort.ASC,
                                    label: "Name"
                                })
                            ]
                    });
                    var searchResultCount = employeeSearchObj.runPaged().count;
                    log.debug("employeeSearchObj result count", searchResultCount);
                    return dataSets.iterateSavedSearch(employeeSearchObj, dataSets.fetchSavedSearchColumn(employeeSearchObj, 'label'));
                },
            };

        }

        function resubmitButton() {
            try {
                var promise = new Promise(function (resolve, reject) {
                    jQuery("#custpage_load_img").css("display", "block");
                    setTimeout(function () {
                        resolve();
                    }, 500)
                });
                promise.then(function () {
                    var recordId = currentRecord.get().id;
                    var recordObj = currentRecord.get();
                    if (recordObj.isDynamic == false) {
                        record.submitFields({
                            type: 'vendorbill',
                            id: recordId,
                            values: {
                                'custbody_jj_reject_reason_wr_218': '',
                                'approvalstatus': 1
                            }
                        });
                        location.reload();

                    } else {
                        // recordObj.setValue({
                        //     fieldId: 'custbody_jj_reject_reason_wr_218',
                        //     value: ''
                        // });
                        // recordObj.setValue({
                        //     fieldId: 'approvalstatus',
                        //     value: 1
                        // });
                        var oldUrl = window.location.href;
                        record.submitFields({
                            type: 'vendorbill',
                            id: recordId,
                            values: {
                                'custbody_jj_reject_reason_wr_218': '',
                                'approvalstatus': 1
                            }
                        });
                        var newUrl = oldUrl.split('&e=T')[0];
                        window.location.href = newUrl;
                    }
                }).catch(function (err) {
                    console.log('err @ resubmit button', err);
                    jQuery("#custpage_load_img").css("display", "none");
                });
            } catch (err) {
                console.log("Error @ resubmitButton", err);
            }
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            resubmitButton: resubmitButton
        };

    });
