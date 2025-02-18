/** @odoo-module **/

import { Component, useState, useRef, onMounted } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { DashboardFilters } from "@Dashboard-Doodex/components/filters/filters";
import { ControlPanel } from "@web/search/control_panel/control_panel";
import { KPI } from "@Dashboard-Doodex/components/KPIs/kpi";
import { Graph } from "@Dashboard-Doodex/components/graph";
import { DashboardController } from "@Dashboard-Doodex/components/controller";

export class DashboardHomepage extends Component {
    static template = "DashboardHomepage";
    static components = {
        ControlPanel,
        DashboardFilters,
        KPI
    };
    setup() {
        this.root = useRef("root");
        this.options = useState(new DashboardController())
        
        // this.graph = new Graph(this.root);
        // onMounted(async () => {
        //     await this.graph.renderLineCharts();
        //     await this.graph.renderComboCharts();
        //     await this.graph.renderPieCharts();
        //     await this.graph.renderSankeyDiagram();
        // });
        this.onFilterChange = this.onFilterChange.bind(this);
        console.log(this.options);
    }

    /**
     * 
     * @param {DashboardFilters} filterComponent
     * To change the filter, we need to change the options of the controller
     */

    onFilterChange(filterComponent){
        this.options = filterComponent.controller;
        this.updateDomain();
    }

    updateDomain(){
        
    }

}

registry.category('actions').add('dashboard_homepage', DashboardHomepage);
