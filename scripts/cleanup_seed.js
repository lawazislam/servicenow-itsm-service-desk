/*
 * Deletes the seeded demo incidents (Scripts - Background).
 * DRY_RUN is true by default: it only reports how many records match.
 * Adjust FIRST and LAST to the incident numbers your seed run created.
 */
var DRY_RUN = true;
var FIRST = 'INC0010006';
var LAST  = 'INC0010205';

var gr = new GlideRecord('incident');
gr.addQuery('number', '>=', FIRST);
gr.addQuery('number', '<=', LAST);
gr.query();
gs.info('Matching incidents: ' + gr.getRowCount());
if (!DRY_RUN) {
    gr.deleteMultiple();
    gs.info('Deleted.');
} else {
    gs.info('Dry run only. Set DRY_RUN = false to delete.');
}
