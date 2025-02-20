/* global owl:readonly */

import { _t } from "@web/core/l10n/translation";
import { formatDate } from "@web/core/l10n/dates";
const { DateTime } = luxon;

export class DashboardController{
    constructor(initialOptions = {}){
        this.options = {
            date: {
                mode: initialOptions.mode || 'range', // 'single' or 'range'
                filter: initialOptions.filter || 'this_month',
                string: '',
                date_from: initialOptions.date_from || DateTime.now().toISODate(),
                date_to: initialOptions.date_to || DateTime.now().toISODate(),
                period_type: 'month',
                period: 0
            },
            category:  initialOptions.category || 'all',
            entity: initialOptions.entity || 'all',
        };
        this.initDateFilters(this.options.date.filter);
    }

    initDateFilters(filter) {
        switch (filter) {
            // Current periods
            case 'this_month':
                this.setThisMonth();
                break;
            case 'this_quarter':
                this.setThisQuarter();
                break;
            case 'this_year':
                this.setThisYear();
                break;
            // Last periods
            case 'last_month':
                this.setLastMonth();
                break;
            case 'last_quarter':
                this.setLastQuarter();
                break;
            case 'last_year':
                this.setLastYear();
                break;
            // Single date options
            case 'today':
                this.setToday();
                break;
            case 'custom':
                // For custom, we'll use the provided dates or default to today
                if (!this.options.date.date_from || !this.options.date.date_to) {
                    this.setToday();
                }
                break;
            default:
                this.setThisMonth();
        }
        this.updateDateString();
    }

    // Current period setters
    setToday() {
        const today = DateTime.now();
        this.options.date.date_from = today.toISODate();
        this.options.date.date_to = today.toISODate();
        this.options.date.period_type = 'day';
    }

    setThisMonth() {
        const now = DateTime.now();
        this.options.date.date_from = now.startOf('month').toISODate();
        this.options.date.date_to = now.endOf('month').toISODate();
        this.options.date.period_type = 'month';
    }

    setThisQuarter() {
        const now = DateTime.now();
        this.options.date.date_from = now.startOf('quarter').toISODate();
        this.options.date.date_to = now.endOf('quarter').toISODate();
        this.options.date.period_type = 'quarter';
    }

    setThisYear() {
        const now = DateTime.now();
        this.options.date.date_from = now.startOf('year').toISODate();
        this.options.date.date_to = now.endOf('year').toISODate();
        this.options.date.period_type = 'year';
    }

    // Last period setters
    setLastMonth() {
        const now = DateTime.now();
        const lastMonth = now.minus({ months: 1 });
        this.options.date.date_from = lastMonth.startOf('month').toISODate();
        this.options.date.date_to = lastMonth.endOf('month').toISODate();
        this.options.date.period_type = 'month';
    }

    setLastQuarter() {
        const now = DateTime.now();
        const lastQuarter = now.minus({ quarters: 1 });
        this.options.date.date_from = lastQuarter.startOf('quarter').toISODate();
        this.options.date.date_to = lastQuarter.endOf('quarter').toISODate();
        this.options.date.period_type = 'quarter';
    }

    setLastYear() {
        const now = DateTime.now();
        const lastYear = now.minus({ years: 1 });
        this.options.date.date_from = lastYear.startOf('year').toISODate();
        this.options.date.date_to = lastYear.endOf('year').toISODate();
        this.options.date.period_type = 'year';
    }

    setDateFrom(dateFrom){
        this.options.date.date_from = dateFrom
        this.updateDateString()
    }

    setDateTo(dateTo){
        this.options.date.date_to = dateTo
        this.updateDateString()
    }

    // Custom date range handling
    setCustomRange(dateFrom, dateTo) {
        const fromDate = DateTime.fromISO(dateFrom);
        const toDate = DateTime.fromISO(dateTo);

        // Validate dates
        if (!fromDate.isValid || !toDate.isValid) {
            throw new Error('Invalid date format. Please use YYYY-MM-DD');
        }

        // Ensure dateFrom is not after dateTo
        if (fromDate > toDate) {
            throw new Error('Start date cannot be after end date');
        }

        this.options.date.date_from = dateFrom;
        this.options.date.date_to = dateTo;
        this.options.date.filter = 'custom';
        this.updateDateString();
    }

    // Date string formatting
    updateDateString() {
        const dateFrom = DateTime.fromISO(this.options.date.date_from);
        const dateTo = DateTime.fromISO(this.options.date.date_to);

        if (this.options.date.mode === 'single' || dateFrom.toISODate() === dateTo.toISODate()) {
            this.options.date.string = formatDate(dateTo);
        } else {
            this.options.date.string = `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
        }
    }

    // Getters for current dates
    getDateFrom() {
        return this.options.date.date_from;
    }

    getDateTo() {
        return this.options.date.date_to;
    }

    getDateFilter() {
        return this.options.date.filter;
    }

    getDateString() {
        return this.options.date.string;
    }

    async _updateOption(optionKey, optionValue){
        let currentOption = null;
        let option = this.options;

        if(optionKey === 'date'){
            option.date.filter = optionValue;
            this.initDateFilters(optionValue);
            this.updateDateString();
        } else {
            option[optionKey] = optionValue;
        }
    }

    async updateOption(optionKey, optionValue){
        await this._updateOption(optionKey, optionValue);
    }
}