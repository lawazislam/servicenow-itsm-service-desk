/*
 * Read-only checks on the seeded incidents (Scripts - Background).
 * Adjust FIRST and LAST to the incident numbers your seed run created.
 */
var FIRST = 'INC0010006';
var LAST  = 'INC0010205';

var total = new GlideAggregate('incident');
total.addQuery('number', '>=', FIRST);
total.addQuery('number', '<=', LAST);
total.addAggregate('COUNT');
total.query();
total.next();
gs.info('Incidents in range: ' + total.getAggregate('COUNT'));

var fields = ['state', 'assignment_group', 'priority', 'category'];
for (var f = 0; f < fields.length; f++) {
    var ga = new GlideAggregate('incident');
    ga.addQuery('number', '>=', FIRST);
    ga.addQuery('number', '<=', LAST);
    ga.addAggregate('COUNT');
    ga.groupBy(fields[f]);
    ga.query();
    while (ga.next()) {
        gs.info(fields[f] + ' = ' + ga.getDisplayValue(fields[f]) + ' : ' + ga.getAggregate('COUNT'));
    }
}

var chk = new GlideRecord('incident');
chk.addQuery('number', '>=', FIRST);
chk.addQuery('number', '<=', LAST);
chk.query();
var badDates = 0, missingNotes = 0, n = 0;
while (chk.next()) {
    var st = chk.getValue('state');
    if (st == '6' || st == '7') {
        if (!chk.getValue('close_notes')) missingNotes++;
        var o = new GlideDateTime(chk.getValue('opened_at'));
        var r = new GlideDateTime(chk.getValue('resolved_at'));
        if (r.getNumericValue() < o.getNumericValue()) badDates++;
        n++;
    }
}
gs.info('Resolved/closed: ' + n + ' | resolved before opened: ' + badDates +
    ' | missing close notes: ' + missingNotes);
