/** @odoo-module **/

import { Component, useState, useRef, onMounted,onWillStart } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { rpc } from "@web/core/network/rpc";
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
        this.dashboardController = new DashboardController();
        this.options = useState(this.dashboardController)
        this.onFilterChange = this.onFilterChange.bind(this);
        this.graph = new Graph(this.root);
        this.state = useState({
            kpiData: null,
            salesPurchaseEvolution: null,
            categoryBreakdownData: null
        });
        onMounted(async () => {
            await this.graph.renderLineCharts(this.state.salesPurchaseEvolution);
            await this.graph.renderComboCharts();
            await this.graph.renderPieCharts(this.state.categoryBreakdownData);
            await this.graph.renderSankeyDiagram();
        });
        onWillStart(async () => {
            await this.getKPIData();
            await this.getSalesPurchaseEvolution();
            await this.getCategoryBreakdownData();
            await this.getStockCrmDistribution();
        });
    }

    /**
     * 
     * @param {DashboardFilters} filterComponent
     * To change the filter, we need to change the options of the controller
     */

    async onFilterChange(filterComponent){
        this.options = filterComponent.controller;
        if(this.options){
            await this.getKPIData();
            await this.getSalesPurchaseEvolution();
            await this.getCategoryBreakdownData();
            await this.getStockCrmDistribution();
            await this.graph.renderLineCharts(this.state.salesPurchaseEvolution);
            await this.graph.renderPieCharts(this.state.categoryBreakdownData);
        }
    }

    async getKPIData(){
        let options = this.options.options;
        try {
            await rpc("/web/dataset/call_kw/universal.dashboard/get_financial_metrics", {
                model: "universal.dashboard",
                method: "get_financial_metrics",
                args: [options.date.period_type, options.date.date_from, options.date.date_to],
                kwargs: {}
            }).then(res => {
                this.state.kpiData = res;
            });
        } catch (error) {
            console.log(error);
        }
    }

    async getSalesPurchaseEvolution(){
        let options = this.options.options;
        try {
            await rpc("/web/dataset/call_kw/universal.dashboard/get_sales_purchase_evolution", {
                model: "universal.dashboard",
                method: "get_sales_purchase_evolution",
                args: [options.date.period_type, options.date.date_from, options.date.date_to],
                kwargs: {}
            }).then(res => {
                this.state.salesPurchaseEvolution = res;
            });
        } catch (error) {
            console.log(error);
        }
    }

    async getCategoryBreakdownData(){
        let options = this.options.options;
        try {
            await rpc("/web/dataset/call_kw/universal.dashboard/get_category_breakdown_data", {
                model: "universal.dashboard",
                method: "get_category_breakdown_data",
                args: [options.date.period_type, options.date.date_from, options.date.date_to],
                kwargs: {}
            }).then(res => {
                this.state.categoryBreakdownData = res;
            });
        } catch (error) {
            console.log(error);
        }
    }

    async getStockCrmDistribution(){
        let options = this.options.options;
        try {
            await rpc("/web/dataset/call_kw/universal.dashboard/get_stock_crm_distribution", {
                model: "universal.dashboard",
                method: "get_stock_crm_distribution",
                args: [options.date.period_type, options.date.date_from, options.date.date_to],
                kwargs: {}
            }).then(res => {
                this.state.stockCrmDistribution = res;
                console.log(this.state.stockCrmDistribution);
            });
        } catch (error) {
            console.log(error);
        }
    }
}

registry.category('actions').add('dashboard_homepage', DashboardHomepage);
