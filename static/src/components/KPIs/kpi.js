/** @odoo-module **/

import { Component, useState } from "@odoo/owl";

export class KPI extends Component {
    static template = "universal_dashboard.KPI";
    static props = {
        name: { type: String, optional: false },
        value: { type: Number, optional: false },
        percentage: { type: Number, optional: false },
    };
    setup() {}
}
