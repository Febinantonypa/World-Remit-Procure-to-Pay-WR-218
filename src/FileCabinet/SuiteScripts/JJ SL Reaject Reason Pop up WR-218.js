/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/format', 'N/https', 'N/record', 'N/ui/serverWidget', 'N/redirect'],
    /**
     * @param{format} format
     * @param{https} https
     * @param{record} record
     * @param{serverWidget} serverWidget
     * @param{redirect} redirect
     */
    (format, https, record, serverWidget, redirect) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            if (scriptContext.request.method == 'GET') {
                try {
                    let form = serverWidget.createForm({
                        title: "Intercompany Resource Assignment"
                    });
                    let rejectField = form.addField({
                        id: 'custpage_reject_reason',
                        type: serverWidget.FieldType.LONGTEXT,
                        label: 'Reject Reason'
                    });
                    form.addSubmitButton({
                        label: 'Submit'
                    });
                    scriptContext.response.writePage(form);
                } catch (err) {
                    log.debug("Erro @ GET", err)
                }
            } else {
                try {
                    let rejectReason = scriptContext.request.parameters.custpage_reject_reason;
                    log.debug("rejectReason", rejectReason);
                    let queryString = scriptContext.request.parameters.entryformquerystring;
                    let recordId = getParameterByName('recId', queryString);
                    log.debug("recordId", recordId);
                    let idd = record.submitFields({
                        type: 'vendorbill',
                        id: recordId,
                        values: {
                            'custbody_jj_reject_reason_wr_218': rejectReason,
                            'approvalstatus' : 3
                        }
                    });
                    log.debug("idd", idd);
                    redirect.toRecord({
                        type: record.Type.VENDOR_BILL,
                        id: recordId,
                    });
                } catch (err) {
                    log.debug("Error @ POST", err)
                }
            }
        }

        function getParameterByName(name, url) { //Retrieve parameter from URL
            name = name.replace(/[\[\]]/g, "\\$&");
            var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
                results = regex
                    .exec(url);
            if (!results)
                return null;
            if (!results[2])
                return ' ';
            return decodeURIComponent(results[2].replace(/\+/g, " "));
        }

        return {onRequest}

    });
