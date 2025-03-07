/** @odoo-module **/

import { Component, useState } from "@odoo/owl";

export class KPI extends Component {
    static template = "universal_dashboard.KPI";
    static props = {
        name: { type: String, optional: false },
        value: { type: String, optional: false },
        percentage: { type: Number, optional: true },
        onClick: { type: Function, optional: true },
    };
    setup() {}
}
