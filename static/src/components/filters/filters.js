/** @odoo-module **/

import { Component, useState, onWillStart } from "@odoo/owl";

export class GlobalFilters extends Component {
    setup() {
        this.state = useState({
          selectedPeriod: "2",
          periodOptions: [
            { id: "0", name: "Today" },
            { id: "1", name: "This Week" },
            { id: "2", name: "This Month" },
            { id: "3", name: "This Quarter" },
            { id: "4", name: "This Financial Year" },
            { id: "5", name: "Last Month" },
            { id: "6", name: "Last Quarter" },
            { id: "7", name: "Last Financial Year" },
            { id: "8", name: "Date Range" },
          ],
        });
    }

    toggleDropdown(type) {
        const dropdowns = [
            'period',
        ];

        dropdowns.forEach((dropdown) => {
            const dropdownKey = `show${dropdown.charAt(0).toUpperCase() + dropdown.slice(1)}Dropdown`;
            if (type === dropdown) {
                this.state[dropdownKey] = !this.state[dropdownKey];
            } else {
                this.state[dropdownKey] = false;
            }
        });
    }

    handleDropdownClick = (type) => {
        this.toggleDropdown(type);
    }

    onClickPeriod = () => this.handleDropdownClick('period');

    selectPeriod = (periodId) => {
        this.state.selectedPeriod = periodId;
        this.state.showPeriodDropdown = false;
        this.props.onPeriodChange(periodId);  // Notify parent component
    }
}

GlobalFilters.template = 'GlobalFilters';