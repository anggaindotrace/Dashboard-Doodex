/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { DashboardFilters } from "../components/filters/filters";
import { ControlPanel } from "@web/search/control_panel/control_panel";

export class DashboardHomepage extends Component {
    static template = "DashboardHomepage";
    static components = {
        ControlPanel,
        DashboardFilters
    };
    setup() {}
}

registry.category('actions').add('dashboard_homepage', DashboardHomepage);
