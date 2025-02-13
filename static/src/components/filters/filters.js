/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { Component, useState, onWillStart } from "@odoo/owl";
import { DateTimeInput } from '@web/core/datetime/datetime_input';
import { Dropdown } from "@web/core/dropdown/dropdown";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { MultiRecordSelector } from "@web/core/record_selectors/multi_record_selector";
import { DashboardController } from "../controller";

const { DateTime } = luxon;

export class DashboardFilters extends Component {
    static template = "universal_dashboard.DashboardFilters";
    static props = {};
    static components = {
        DateTimeInput,
        Dropdown,
        DropdownItem,
        MultiRecordSelector,
    };

    setup() {
        this.controller = useState(new DashboardController())
    }

    //------------------------------------------------------------------------------------------------------------------
    // Helpers
    //------------------------------------------------------------------------------------------------------------------
    handleDateFromChange(value){
        this.setDateFrom(value)
    }

    handleDateToChange(value){
        debugger;
        this.setDateTo(value)
    }

    handleDateFilterChange(filter){
        debugger;
        console.log(this.controller)
        // this.setDateFilter(filter)
    }

    //------------------------------------------------------------------------------------------------------------------
    // Dates
    //------------------------------------------------------------------------------------------------------------------
    // Getters
    dateFrom(){
        return DateTime.fromISO(this.controller.options.date.date_from)
    }

    dateTo(){
        return DateTime.fromISO(this.controller.options.date.date_to)
    }

    //setters
    setDateFrom(dateFrom){
        this.controller.setDateFrom(dateFrom.toISODate())
    }

    setDateTo(dateTo){
        this.controller.setDateTo(dateTo.toISODate())
    }

    setDateFilter(filter){
        // this.controller.setDateFilter(filter)
    }
}