/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { GlobalFilters } from "../components/filters/filters";
import { _t } from "@web/core/l10n/translation";

class BaseDashboardHomepage extends Component {
    setup() {
        this.props.title = _t("Dashboard");
        this.initializeState();
    }

    initializeState() {
        this.state = useState({
            selectedPeriod: "2",
        });
    }
}

class DashboardHomepage extends BaseDashboardHomepage {

    updatePeriod = (periodId) => {
        this.state.selectedPeriod = periodId;
        console.log(periodId);
    }
}

DashboardHomepage.template = "DashboardHomepage";
DashboardHomepage.components = {
    GlobalFilters,
};

registry.category('actions').add('dashboard_homepage', DashboardHomepage);
