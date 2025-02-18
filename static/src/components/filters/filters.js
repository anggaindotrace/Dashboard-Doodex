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
    static props = {
        onFilterChange: {
            type: Function,
            required: true
        }
    };
    static components = {
        DateTimeInput,
        Dropdown,
        DropdownItem,
        MultiRecordSelector,
    };

    setup() {
        this.controller = useState(new DashboardController())
        if(this.props.onFilterChange){
            this.props.onFilterChange(this.controller);
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Helpers
    //------------------------------------------------------------------------------------------------------------------
    handleDateFromChange(value){
        this.setDateFrom(value)
        if (this.props.onFilterChange) {
            this.props.onFilterChange(this);
        }
    }

    handleDateToChange(value){
        this.setDateTo(value)
        if (this.props.onFilterChange) {
            this.props.onFilterChange(this);
        }
    }

    handleDateFilterChange(filter){
        this.controller.updateOption('date', filter);
        if (this.props.onFilterChange) {
            this.props.onFilterChange(this);
        }
    }

    handleCategoryChange(category){
        this.controller.updateOption('category', category);
        if (this.props.onFilterChange) {
            this.props.onFilterChange(this);
        }
    }

    handleEntityChange(entity){
        this.controller.updateOption('entity', entity);
        if (this.props.onFilterChange) {
            this.props.onFilterChange(this);
        }
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