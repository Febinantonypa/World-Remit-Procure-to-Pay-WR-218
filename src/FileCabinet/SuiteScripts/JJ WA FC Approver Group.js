/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/https', 'N/record', 'N/search', 'N/url', 'N/redirect', 'N/runtime'],
    /**
     * @param{https} https
     * @param{record} record
     * @param{search} search
     * @param{url} url
     * @param{redirect} redirect
     * @param{runtime} runtime
     */
    (https, record, search, url, redirect, runtime) => {
        /**
         * Defines the WorkflowAction script trigger point.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
         * @param {string} scriptContext.type - Event type
         * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
         * @since 2016.1
         */
        const onAction = (scriptContext) => {
            try {
                let newRecord = scriptContext.newRecord;
                let userObj = runtime.getCurrentUser();
                let runtimeUser = userObj.id;
                let fcApprovers = newRecord.getValue({
                    fieldId: "custbody_wr_237_fc_bill_approver_jj"
                });
                if(fcApprovers.includes(runtimeUser.toString())) {
                    return 'True';
                } else {
                    return 'False';
                }
            } catch (err) {
                log.error('ERROR', JSON.stringify(err));
            }
        }
        return {onAction};
    });