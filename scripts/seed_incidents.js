/*
 * Demo Incident Generator (Scripts - Background)
 * Creates weighted, randomised Incident records with realistic
 * descriptions, lifecycle states and resolution data.
 * Every record is tagged DEMO_SEED in work notes.
 *
 * Data is SYNTHETIC. Say so wherever the results are shown.
 *
 * Prerequisite: incident category choices 'access' (Access and Passwords)
 * and 'email' (Email) must exist in sys_choice.
 */

// ---- Configuration ----------------------------------------
var DRY_RUN   = true;        // true = log only, false = insert records
var TOTAL     = 200;         // number of incidents to create
var DAYS_BACK = 90;          // spread opened_at over this many past days
var SEED_TAG  = 'DEMO_SEED'; // marker in work notes

// ---- Category labels (weighted) and stored values ---------
var CATEGORIES = [
    'Software', 'Software', 'Software',
    'Network', 'Network',
    'Hardware', 'Hardware',
    'Access and Passwords', 'Access and Passwords',
    'Email'
];
var CATEGORY_VALUES = {
    'Software': 'software',
    'Network': 'network',
    'Hardware': 'hardware',
    'Access and Passwords': 'access',
    'Email': 'email'
};

// ---- Impact / urgency pool ---------------------------------
var SEVERITY_POOL = ['1', '2', '2', '2', '2', '2', '3', '3', '3', '3', '3'];

// ---- State pool: New, In Progress, On Hold, Resolved, Closed
var STATE_POOL = [
    '1', '1', '1', '1', '1',
    '2', '2', '2', '2', '2',
    '3', '3', '3',
    '6', '6', '6', '6',
    '7', '7', '7'
];

// ---- Default priority lookup, used only for the dry-run preview
var PRIORITY_MAP = {
    '1-1': '1', '1-2': '2', '1-3': '3',
    '2-1': '2', '2-2': '3', '2-3': '4',
    '3-1': '3', '3-2': '4', '3-3': '5'
};

var CLOSE_CODES = [
    'Solved (Work Around)',
    'Solved (Permanently)',
    'Solved Remotely (Work Around)',
    'Solved Remotely (Permanently)',
    'Not Solved (Not Reproducible)',
    'Not Solved (Too Costly)',
    'Closed/Resolved by Caller'
];

var DESCRIPTIONS = {
    'Software': [
        ['Application crashes on launch after latest update',
         'User reports the CRM application crashes immediately on launch following the most recent patch. Restarting the workstation does not help. The error log references a missing DLL.'],
        ['Unable to save documents in the reporting tool',
         'Several finance users cannot save reports. The save button greys out after a file path is chosen. The issue began after the server-side update last Friday.'],
        ['Licence activation failure for design suite',
         'The design suite shows licence expired despite a valid renewal. The licence server shows the seat as available. Re-activation returns error code 0x80070005.'],
        ['Software update stuck at 45 percent on department laptops',
         'The endpoint protection agent update stalls at 45 percent on about thirty laptops in Building C. Manual retry gives the same result. Network bandwidth looks normal.'],
        ['PDF export produces blank pages from the analytics dashboard',
         'Exporting any dashboard to PDF gives a file with the correct page count but blank content. On-screen rendering is correct. Reproducible in Chrome and Edge.'],
        ['Single sign-on loop when accessing the HR portal',
         'Users are stuck in an authentication redirect loop when opening the HR self-service portal through SSO. Direct username and password login works.'],
        ['Automated report scheduler sends duplicate emails',
         'The nightly sales report reaches every recipient twice. The schedule record shows one execution, but the mail log contains two send events per address.'],
        ['Custom workflow fails silently after platform upgrade',
         'A custom approval workflow that worked before the upgrade now completes without running the notification step. No errors appear in the log.']
    ],
    'Network': [
        ['Intermittent VPN disconnections for remote employees',
         'Remote employees in the EMEA region report VPN drops every 20 to 30 minutes. The concentrator logs show a DPD timeout. Reconnecting works but interrupts file transfers.'],
        ['Wireless access points on floor 3 not authenticating clients',
         'All five access points on floor 3 show online in the controller, but clients get an authentication failure. Wired connections on the same floor work normally.'],
        ['DNS resolution failures for internal domains',
         'Lookups for internal hostnames intermittently return SERVFAIL from the secondary DNS server. The primary responds correctly.'],
        ['Network printer unreachable from VLAN 10 after switch replacement',
         'After the east wing access switch was replaced, devices on VLAN 10 cannot reach the shared printer. Devices on other VLANs print normally.'],
        ['High latency on video calls through the WAN optimiser',
         'Video calls that pass through the WAN optimiser show latency above 400 ms and frequent pixelation. Bypassing the optimiser drops latency to 35 ms. Appliance CPU sits at 92 percent.'],
        ['Site-to-site tunnel flapping between data centres',
         'The IPSec tunnel between DC-East and DC-West has dropped about every five minutes since last night\'s ISP maintenance window.'],
        ['DHCP scope exhaustion on guest network',
         'Guest wireless users receive APIPA addresses. The guest DHCP scope shows 100 percent utilisation with an 8 hour lease time.']
    ],
    'Hardware': [
        ['Laptop screen flickers when connected to docking station',
         'The display flickers continuously when the laptop is on the Thunderbolt dock, but not on battery without the dock. Dock firmware is current.'],
        ['Desktop fails POST with three beeps after memory upgrade',
         'After a RAM upgrade from 16 GB to 32 GB the desktop beeps three times and never reaches the BIOS screen. Re-seating the original modules restores boot.'],
        ['Badge reader at server room entrance not responding',
         'The proximity card reader at the server room door no longer releases the magnetic lock. The access panel shows the reader offline. Power cycling had no effect.'],
        ['Multifunction printer reports paper jam in empty tray',
         'The printer shows a persistent jam in Tray 2 even when the tray is empty and clean. The sensor lever moves freely but the firmware still flags the error.'],
        ['External monitor not detected on new laptop model',
         'The new laptop model does not detect the 27 inch monitor through the USB-C to DisplayPort adapter. The same monitor works with other laptops on the same cable.'],
        ['UPS battery replacement warning on rack 4A',
         'The UPS for rack 4A shows a battery replacement warning. Estimated runtime has dropped from 22 minutes to 6 minutes. Batteries were last replaced 39 months ago.'],
        ['Docking station USB ports providing insufficient power',
         'USB peripherals on the dock disconnect at random. The event log shows overcurrent warnings on the hub controller. A powered USB hub works around it.']
    ],
    'Access and Passwords': [
        ['Account locked out after password reset',
         'The user changed their password in the self-service portal and was immediately locked out. The AD event log shows the old password being retried by a cached session on another device.'],
        ['New hire missing access to the finance shared drive',
         'A new Accounts Payable hire cannot open \\\\files\\finance. Their account is in the correct OU but the finance-read group was not provisioned during onboarding.'],
        ['MFA token out of sync after phone replacement',
         'The user replaced their phone and restored from backup. The authenticator app now generates codes that the MFA gateway rejects.'],
        ['Service account password expired causing batch job failures',
         'Overnight inventory batch jobs failed because the service account password expired. Twelve dependent jobs are queued waiting for the credential update.'],
        ['VPN access denied despite approved remote work request',
         'The employee has an approved remote-work arrangement starting this week but gets access denied on the VPN. The account is not yet in the VPN-users group.'],
        ['Shared mailbox permissions not working after migration',
         'After the move to Exchange Online, three users who had full access to the orders shared mailbox can no longer open it. Permissions look correct in the admin centre.'],
        ['Contractor account disabled prematurely',
         'A contractor whose engagement was extended through Q2 had their account disabled by the expiry job. The identity feed did not pick up the new end date.']
    ],
    'Email': [
        ['Emails to external recipients bouncing with 550 error',
         'Outbound mail to external addresses bounces with a 550 relay not permitted error. Internal mail is unaffected. The issue began after a firewall rule change last night.'],
        ['Distribution list not receiving messages from external senders',
         'The all-staff list receives internal mail but silently drops external messages. The transport rule was modified during a spam-filter policy update.'],
        ['Attachment size limit blocking legitimate invoices',
         'Accounts receivable cannot send PDF invoices larger than 10 MB. The limit was cut from 25 MB to 10 MB during a storage clean-up without notice.'],
        ['Auto-forward rule causing a mail loop',
         'A user forwarded their mailbox to a shared mailbox that forwards back. The loop generated over 5,000 non-delivery reports before the account was throttled.'],
        ['Calendar invitations arriving as winmail.dat attachments',
         'Recipients on non-Outlook clients receive meeting invitations as unreadable winmail.dat files. Sending from Outlook on the web produces the correct format.'],
        ['Delayed email delivery during peak morning hours',
         'Mail sent between 08:00 and 09:30 takes 15 to 45 minutes to arrive. Queue depth spikes to 12,000 messages in that window. Off-peak delivery takes under 10 seconds.']
    ]
};

var CLOSE_NOTES = {
    'Software': [
        'Applied the vendor patch and confirmed the application launches correctly.',
        'Cleared the local cache and reinstalled the module. Functionality restored.',
        'Rolled back to the previous version pending a permanent vendor fix.',
        'Reconfigured the licence server entry. Activation succeeded on retry.'
    ],
    'Network': [
        'Replaced the faulty SFP module. Link stable over 24 hours.',
        'Corrected the VLAN tagging on the trunk port. Traffic flowing normally.',
        'Flushed the DNS cache on the resolver and restarted the service. Lookups restored.',
        'Adjusted the MTU on the tunnel interface. No further drops observed.'
    ],
    'Hardware': [
        'Swapped the defective RAM module. POST successful with 32 GB detected.',
        'Replaced the badge reader. Access control recognises cards again.',
        'Updated the docking station firmware. Display flicker resolved.',
        'Cleared the jam sensor and recalibrated. Printer operational.'
    ],
    'Access and Passwords': [
        'Unlocked the account and cleared cached credentials on all devices.',
        'Added the user to the correct security group. Access verified.',
        'Re-enrolled the MFA token on the new device. Authentication successful.',
        'Extended the service account expiry and added it to the non-expiring policy group.'
    ],
    'Email': [
        'Restored the relay rule on the firewall. Outbound delivery confirmed.',
        'Updated the transport rule to allow external senders to the list.',
        'Restored the attachment limit to 25 MB per policy approval.',
        'Removed the circular forward rule and purged the queued reports.'
    ]
};

// ---- Helpers ----------------------------------------------
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomOpenedAt(daysBack) {
    var nowMs = new GlideDateTime().getNumericValue();
    var span = daysBack * 24 * 60 * 60 * 1000;
    var gdt = new GlideDateTime();
    gdt.setNumericValue(nowMs - Math.floor(Math.random() * span));
    return gdt;
}

// Random time after a given date and before now.
function randomDateAfter(afterGdt) {
    var afterMs = afterGdt.getNumericValue();
    var nowMs = new GlideDateTime().getNumericValue();
    var earliest = afterMs + (60 * 60 * 1000); // at least 1 hour later
    if (earliest >= nowMs) {
        earliest = afterMs + 1000;
    }
    var gdt = new GlideDateTime();
    if (earliest >= nowMs) {
        gdt.setNumericValue(nowMs);
        return gdt;
    }
    gdt.setNumericValue(earliest + Math.floor(Math.random() * (nowMs - earliest)));
    return gdt;
}

function addStat(stats, category, pri) {
    if (!stats[category]) stats[category] = {};
    if (!stats[category][pri]) stats[category][pri] = 0;
    stats[category][pri]++;
}

// ---- Load lookup pools ------------------------------------
var userIds = [];
var uGR = new GlideRecord('sys_user');
uGR.addActiveQuery();
uGR.query();
while (uGR.next()) {
    userIds.push(uGR.getUniqueValue());
}
gs.info('Loaded ' + userIds.length + ' active users');

// Only three relevant assignment groups are used.
// Each is found by name, or created (live mode only).
var groupIdByName = {};
var groupNames = ['Service Desk', 'Network', 'Hardware'];
for (var gi = 0; gi < groupNames.length; gi++) {
    var grp = new GlideRecord('sys_user_group');
    grp.addQuery('name', groupNames[gi]);
    grp.setLimit(1);
    grp.query();
    if (grp.next()) {
        groupIdByName[groupNames[gi]] = grp.getUniqueValue();
    } else if (DRY_RUN) {
        groupIdByName[groupNames[gi]] = 'DRY_RUN_PLACEHOLDER';
    } else {
        grp.initialize();
        grp.setValue('name', groupNames[gi]);
        groupIdByName[groupNames[gi]] = grp.insert();
    }
}
var GROUP_FOR = {
    'Software': groupIdByName['Service Desk'],
    'Access and Passwords': groupIdByName['Service Desk'],
    'Email': groupIdByName['Service Desk'],
    'Network': groupIdByName['Network'],
    'Hardware': groupIdByName['Hardware']
};
var groupsOk = GROUP_FOR['Software'] && GROUP_FOR['Network'] && GROUP_FOR['Hardware'];
gs.info('Groups ready: Service Desk, Network, Hardware');

// ---- Main -------------------------------------------------
if (userIds.length === 0 || !groupsOk) {
    gs.error('Cannot proceed: no active users, or the three groups could not be found or created.');
} else {

    var stats = {};
    var created = 0;

    for (var i = 0; i < TOTAL; i++) {

        var category = pickRandom(CATEGORIES);
        var impact   = pickRandom(SEVERITY_POOL);
        var urgency  = pickRandom(SEVERITY_POOL);
        var state    = pickRandom(STATE_POOL);
        var caller   = pickRandom(userIds);
        var group    = GROUP_FOR[category];
        var openedAt = randomOpenedAt(DAYS_BACK);

        var descPair  = pickRandom(DESCRIPTIONS[category]);
        var shortDesc = descPair[0];
        var longDesc  = descPair[1];

        // Resolved (6) and Closed (7) need resolution data.
        var isTerminal = (state === '6' || state === '7');
        var closeCode  = isTerminal ? pickRandom(CLOSE_CODES) : '';
        var closeNotes = isTerminal ? pickRandom(CLOSE_NOTES[category]) : '';
        var resolvedAt = isTerminal ? randomDateAfter(openedAt) : null;
        var closedAt   = (state === '7' && resolvedAt) ? randomDateAfter(resolvedAt) : null;

        if (DRY_RUN) {
            gs.info('[DRY RUN] #' + (i + 1) + '/' + TOTAL +
                ' | state=' + state +
                ' | cat=' + category +
                ' | imp=' + impact +
                ' | urg=' + urgency +
                ' | opened=' + openedAt.getDisplayValue() +
                (isTerminal ? ' | resolved=' + resolvedAt.getDisplayValue() : '') +
                (closedAt ? ' | closed=' + closedAt.getDisplayValue() : '') +
                (isTerminal ? ' | close_code=' + closeCode : '') +
                ' | ' + shortDesc);

            addStat(stats, category, PRIORITY_MAP[impact + '-' + urgency]);

        } else {
            var inc = new GlideRecord('incident');
            inc.initialize();
            inc.setValue('short_description', shortDesc);
            inc.setValue('description', longDesc);
            inc.setValue('category', CATEGORY_VALUES[category]);
            inc.setValue('impact', impact);
            inc.setValue('urgency', urgency);
            // Priority is never set here. The platform calculates it.
            inc.setValue('state', state);
            inc.setValue('caller_id', caller);
            inc.setValue('assignment_group', group);
            inc.setValue('opened_at', openedAt.getValue());

            if (isTerminal) {
                inc.setValue('close_code', closeCode);
                inc.setValue('close_notes', closeNotes);
                inc.setValue('resolved_at', resolvedAt.getValue());
            }
            if (closedAt) {
                inc.setValue('closed_at', closedAt.getValue());
            }

            inc.work_notes = SEED_TAG;

            var sysId = inc.insert();

            if (sysId) {
                created++;
                var readBack = new GlideRecord('incident');
                if (readBack.get(sysId)) {
                    addStat(stats, category, readBack.getValue('priority'));
                }
            } else {
                gs.warn('Insert failed for incident #' + (i + 1));
            }
        }
    }

    // ---- Summary: category by priority --------------------
    gs.info('========================================');
    gs.info(DRY_RUN ? 'DRY-RUN SUMMARY (priorities estimated)' : 'CREATION SUMMARY');
    gs.info('========================================');

    var allPriorities = {};
    for (var cat in stats) {
        for (var p in stats[cat]) {
            allPriorities[p] = true;
        }
    }
    var priKeys = Object.keys(allPriorities).sort();
    var catNames = Object.keys(stats).sort();

    for (var c = 0; c < catNames.length; c++) {
        var catName = catNames[c];
        var catTotal = 0;
        var parts = [];
        for (var k = 0; k < priKeys.length; k++) {
            var cnt = stats[catName][priKeys[k]] || 0;
            catTotal += cnt;
            parts.push('P' + priKeys[k] + '=' + cnt);
        }
        gs.info(catName + ': total=' + catTotal + ' | ' + parts.join(' '));
    }

    gs.info('========================================');
    if (DRY_RUN) {
        gs.info(TOTAL + ' incidents would be created. Set DRY_RUN = false to commit.');
    } else {
        gs.info('Created ' + created + ' of ' + TOTAL + ' incidents.');
    }
}
