/** @odoo-module **/

import { Component, useState, useRef, onMounted, onWillStart } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { rpc } from "@web/core/network/rpc";
import { KPI } from "@Dashboard-Doodex/components/KPIs/kpi";
import { Graph } from "@Dashboard-Doodex/components/graph";
const { DateTime } = luxon;

export class SalesPerformanceDashboard extends Component {
    static template = "SalesPerformanceDashboard";
    static components = {
        KPI
    };
    
    setup() {
        this.root = useRef("root");
        this.action = useService("action");
        this.orm = useService("orm");
        this.customerDropdownRef = useRef("customerDropdown");
        this.productDropdownRef = useRef("productDropdown");
        this.categoryDropdownRef = useRef("categoryDropdown");
        this.graph = new Graph(this.root);
        this.state = useState({
            totalSalesValidatedAmount: 0,
            currency: [],
            quoteToOrderConversionRate: 0,
            totalValidatedInvoice: 0,
            totalOverdueInvoice: 0,
            averageSaleOrder: 0,
            top3ProductsBySales: [],
            dateFrom: DateTime.now().startOf('month').toISODate(),
            dateTo: DateTime.now().endOf('month').toISODate(),
            dateFilterHeader: "This Month",
            isValueActive: true,
            isQtyActive: false,

            isCustomerDropdownOpen: false,
            isProductDropdownOpen: false,
            isProductCategoryDropdownOpen: false,

            customers: [],
            customerIds: [],
            filteredCustomers: [],
            selectedCustomers: [],
            customerSearchText: "",
            customerNameHeader: "All",

            products: [],
            productIds: [],
            filteredProducts: [],
            selectedProducts: [],
            productSearchText: "",
            productNameHeader: "All",

            productCategories: [],
            productCategoryIds: [],
            filteredProductCategories: [],
            selectedProductCategories: [],
            productCategorySearchText: "",
            productCategoryNameHeader: "-",

            averageSaleOrderLine: [],
            averagetype: 'weekly',
            totalAmountBySalesperson: [],
            totalSaleOrderIdBySalesperson: [],
        });
        onMounted(async () => {
            await this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, 'value');
            this.state.customers = this.getCustomerList(this.state.salesPerformanceData);
            await this.graph.renderCombinationChart(this.state.saleTemporalAnalysis,'#sales-temporal-analysis', this.state.dateFilterHeader);
            await this.graph.renderHierarchyChart(this.state.categoryProductHierarchy,'#distribution-analysis');

            await this.graph.renderBarChart(this.state.totalAmountBySalesperson, '#revenue-by-salesperson');
            await this.graph.renderBarChart(this.state.totalSaleOrderIdBySalesperson, '#number-of-quotes-by-salesperson');
            this.state.averageSaleOrderLine = await this.getAverageSaleOrderByTimeGroup(this.state.salesPerformanceData, this.state.averagetype);
            await this.graph.renderAverageSaleOrderLine(this.state.averageSaleOrderLine);
            this.state.filteredCustomers = [...this.state.customers];
            this.state.filteredProducts = [...this.state.products];
            this.state.filteredProductCategories = this.state.productCategories.filter(category => category.name !== "All");
        });
        onWillStart(async () => {
            await this.getSalesPerformanceData();
            await this.getProductDatas();
            await this.getProductCategoryDatas();
        })
    }

    onGlobalClick(ev){
        if (this.state.isCustomerDropdownOpen && 
            this.customerDropdownRef.el && 
            !this.customerDropdownRef.el.contains(ev.target)) {
            this.state.isCustomerDropdownOpen = false;
        }
        if (this.state.isProductDropdownOpen && 
            this.productDropdownRef.el && 
            !this.productDropdownRef.el.contains(ev.target)) {
            this.state.isProductDropdownOpen = false;
        }
        if (this.state.isProductCategoryDropdownOpen && 
            this.categoryDropdownRef.el && 
            !this.categoryDropdownRef.el.contains(ev.target)) {
            this.state.isProductCategoryDropdownOpen = false;
        }
    }

    /**
     * 
     * @param {*} dropdown type
     * for open and close dropdown
     */
    toggleDropdown(type) {
        const dropdowns = [
            'customer',
            'product',
            'productCategory'
        ];
        
        dropdowns.forEach(dropdown => {
            const dropdownKey = `is${dropdown.charAt(0).toUpperCase() + dropdown.slice(1)}DropdownOpen`;
            if(type === dropdown) {
                this.state[dropdownKey] = !this.state[dropdownKey];
            } else {
                this.state[dropdownKey] = false;
            }
        });
    }

    handleSearch(searchType, ev) {
        const searchText = ev.target.value.toLowerCase();
        this.state[`${searchType}SearchText`] = searchText;
        
        const options = this.state[`${searchType}`];
        this.state[`filtered${searchType.charAt(0).toUpperCase() + searchType.slice(1)}`] = 
            options.filter(option => option.name.toLowerCase().includes(searchText));
    }

    toggleOption(optionType, option) {
        const selectedArray = `selected${optionType.charAt(0).toUpperCase() + optionType.slice(1)}`;
        const index = this.state[selectedArray].findIndex(item => item.id === option.id);
        
        if (index === -1) {
            this.state[selectedArray].push(option);
        } else {
            this.state[selectedArray].splice(index, 1);
        }
        if (optionType === 'Customers') {
            this.state.customerIds = this.state[selectedArray].map(item => item.id);
            this.onCustomerSelect();
        } else if(optionType === 'Products'){
            this.state.productIds = this.state[selectedArray].map(item => item.id);
            this.onProductSelect();
        } else if(optionType === 'ProductCategories'){
            this.state.productCategoryIds = this.state[selectedArray].map(item => item.id);
            this.onProductCategorySelect();
        }
    }

    isSelected(optionType, option) {
        const selectedArray = `selected${optionType.charAt(0).toUpperCase() + optionType.slice(1)}`;
        return this.state[selectedArray].some(item => item.id === option.id);
    }

    handleDropdownClick = (type) => {
        this.toggleDropdown(type);
    }

    clearAllFilters(filterType) {
        const selectedArray = `selected${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`;
        this.state[selectedArray] = [];
        if (filterType === 'customers') {
            this.state.customerIds = [];
            this.onCustomerSelect();
        } else if (filterType === 'products') {
            this.state.productIds = [];
            this.onProductSelect();
        } else if(filterType === 'productCategories'){
            this.state.productCategoryIds = [];
            this.onProductCategorySelect();
        }
    }

    selectAll(filterType) {
        const optionsArray = filterType;
        const filteredArray = `filtered${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`;
        const selectedArray = `selected${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`;
        const searchText = this.state[`${filterType}SearchText`];
        
        if (searchText) {
            // If searching, only select filtered options that aren't already selected
            const newSelections = this.state[filteredArray].filter(
                option => !this.isSelected(filterType, option)
            );
            this.state[selectedArray] = [...this.state[selectedArray], ...newSelections];
            if (filterType === 'customers') {
                this.state.customerIds = this.state[selectedArray].map(item => item.id);
            } else if (filterType === 'products') {
                this.state.productIds = this.state[selectedArray].map(item => item.id);
            } else if(filterType === 'productCategories'){
                this.state.productCategoryIds = this.state[selectedArray].map(item => item.id);
            }
        } else {
            // If not searching, select all options
            this.state[selectedArray] = [...this.state[optionsArray]];
            if (filterType === 'customers') {
                this.state.customerIds = this.state[selectedArray].map(item => item.id);
            } else if (filterType === 'products') {
                this.state.productIds = this.state[selectedArray].map(item => item.id);
            } else if(filterType === 'productCategories'){
                this.state.productCategoryIds = this.state[selectedArray].map(item => item.id);
            }
        }
        if (filterType === 'customers') {
            this.onCustomerSelect();
        } else if (filterType === 'products') {
            this.onProductSelect();
        } else if(filterType === 'productCategories'){
            this.onProductCategorySelect();
        }
    }

    areAllSelected(filterType) {
        const filteredArray = `filtered${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`;
        
        if (this.state[filteredArray].length === 0) return false;
        
        return this.state[filteredArray].every(option => 
            this.isSelected(filterType, option)
        );
    }

    onClickCustomerOption = () => { this.handleDropdownClick('customer') }
    onClickProductOption = () => { this.handleDropdownClick('product') }
    onClickProductCategoryOption = () => { this.handleDropdownClick('productCategory') }

    async onDateFilterSelect(dateFilter) {
        this.state.dateFilterHeader = dateFilter;
        const today = new Date();
        var averagetype = 'weekly';
        if (dateFilter === "This Month") {
            this.state.dateFrom = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)).toISOString().split('T')[0];
            this.state.dateTo = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 0)).toISOString().split('T')[0];
            averagetype = 'weekly';
        } else if (dateFilter === "This Quarter") {
            const currentQuarter = Math.floor(today.getMonth() / 3);
            this.state.dateFrom = new Date(Date.UTC(today.getFullYear(), currentQuarter * 3, 1)).toISOString().split('T')[0];
            this.state.dateTo = new Date(Date.UTC(today.getFullYear(), (currentQuarter + 1) * 3, 0)).toISOString().split('T')[0];
            averagetype = 'monthly';
        } else if (dateFilter === "This Financial Year") {
            this.state.dateFrom = new Date(Date.UTC(today.getFullYear(), 0, 1)).toISOString().split('T')[0];
            this.state.dateTo = new Date(Date.UTC(today.getFullYear(), 11, 31)).toISOString().split('T')[0];
            averagetype = 'quarterly';
        } else if (dateFilter === "Last Month") {
            this.state.dateFrom = new Date(Date.UTC(today.getFullYear(), today.getMonth() - 1, 1)).toISOString().split('T')[0];
            this.state.dateTo = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 0)).toISOString().split('T')[0];
            averagetype = 'weekly';
        } else if (dateFilter === "Last Quarter") {
            const lastQuarter = Math.floor((today.getMonth() - 3) / 3);
            this.state.dateFrom = new Date(Date.UTC(today.getFullYear(), lastQuarter * 3, 1)).toISOString().split('T')[0];
            this.state.dateTo = new Date(Date.UTC(today.getFullYear(), (lastQuarter + 1) * 3, 0)).toISOString().split('T')[0];
            averagetype = 'monthly';
        } else if (dateFilter === "Last Financial Year") {
            this.state.dateFrom = new Date(Date.UTC(today.getFullYear() - 1, 0, 1)).toISOString().split('T')[0];
            this.state.dateTo = new Date(Date.UTC(today.getFullYear() - 1, 11, 31)).toISOString().split('T')[0];
            averagetype = 'quarterly';
        } else if (dateFilter === "Custom") {
            const dateFromInput = document.getElementById('dateFrom').value;
            const dateToInput = document.getElementById('dateTo').value;
            this.state.dateFrom = dateFromInput;
            this.state.dateTo = dateToInput;
            const formatDate = (date) => {
                const [year, month, day] = date.split('-');
                return `${day}/${month}/${year}`;
            };
            this.state.dateFilterHeader = `${formatDate(dateFromInput)} - ${formatDate(dateToInput)}`;
            averagetype = 'weekly';
        }
        await this.getSalesPerformanceData();
        await this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, this.state.isValueActive ? 'value' : 'quantity');
        await this.graph.renderCombinationChart(this.state.saleTemporalAnalysis,'#sales-temporal-analysis', this.state.dateFilterHeader);
        await this.graph.renderHierarchyChart(this.state.categoryProductHierarchy, '#distribution-analysis');
        await this.graph.renderBarChart(this.state.totalAmountBySalesperson, '#revenue-by-salesperson');
        await this.graph.renderBarChart(this.state.totalSaleOrderIdBySalesperson, '#number-of-quotes-by-salesperson');
        this.state.averageSaleOrderLine = await this.getAverageSaleOrderByTimeGroup(this.state.salesPerformanceData, averagetype);
        await this.graph.renderAverageSaleOrderLine(this.state.averageSaleOrderLine);
    }

    async onCustomerSelect() {
        await this.getSalesPerformanceData();
        await this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, this.state.isValueActive ? 'value' : 'quantity');
        await this.graph.renderBarChart(this.state.totalAmountBySalesperson, '#revenue-by-salesperson');
        await this.graph.renderCombinationChart(this.state.saleTemporalAnalysis,'#sales-temporal-analysis', this.state.dateFilterHeader);
        await this.graph.renderBarChart(this.state.totalSaleOrderIdBySalesperson, '#number-of-quotes-by-salesperson');
        await this.graph.renderHierarchyChart(this.state.categoryProductHierarchy, '#distribution-analysis');
        this.state.averageSaleOrderLine = await this.getAverageSaleOrderByTimeGroup(this.state.salesPerformanceData, this.state.averagetype);
        await this.graph.renderAverageSaleOrderLine(this.state.averageSaleOrderLine);
    }


    async onProductSelect() {
        await this.getSalesPerformanceData();
        await this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, this.state.isValueActive ? 'value' : 'quantity');
        await this.graph.renderBarChart(this.state.totalAmountBySalesperson, '#revenue-by-salesperson');
        await this.graph.renderBarChart(this.state.totalSaleOrderIdBySalesperson, '#number-of-quotes-by-salesperson');
        await this.graph.renderHierarchyChart(this.state.categoryProductHierarchy, '#distribution-analysis');
        this.state.averageSaleOrderLine = await this.getAverageSaleOrderByTimeGroup(this.state.salesPerformanceData, this.state.averagetype);
        await this.graph.renderAverageSaleOrderLine(this.state.averageSaleOrderLine);
        await this.graph.renderCombinationChart(this.state.saleTemporalAnalysis,'#sales-temporal-analysis', this.state.dateFilterHeader);
    }

    async onProductCategorySelect() {
        await this.getSalesPerformanceData();
        await this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, this.state.isValueActive ? 'value' : 'quantity');
        await this.graph.renderBarChart(this.state.totalAmountBySalesperson, '#revenue-by-salesperson');
        await this.graph.renderBarChart(this.state.totalSaleOrderIdBySalesperson, '#number-of-quotes-by-salesperson');
        await this.graph.renderHierarchyChart(this.state.categoryProductHierarchy, '#distribution-analysis');
        this.state.averageSaleOrderLine = await this.getAverageSaleOrderByTimeGroup(this.state.salesPerformanceData, this.state.averagetype);
        await this.graph.renderAverageSaleOrderLine(this.state.averageSaleOrderLine);
        await this.graph.renderCombinationChart(this.state.saleTemporalAnalysis,'#sales-temporal-analysis', this.state.dateFilterHeader);
    }

    filterByValue() {
        this.state.isValueActive = true;
        this.state.isQtyActive = false;
        // this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, 'value');
    }

    filterByQty() {
        this.state.isValueActive = false;
        this.state.isQtyActive = true;
        // this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, 'quantity');
    }

    getTotalSalesValidatedAmount(salesPerformanceData) {
        if (!salesPerformanceData) {
            return 0;
        }
        const total = salesPerformanceData
            .filter(sale => sale.state === 'sale')
            .reduce((total, sale) => total + sale.amount, 0);
        return total.toLocaleString('en-US', {
            style: 'currency',
            currency: this.state.currency.currency_name,
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
    }

    getQuoteToOrderConversionRate(salesPerformanceData) {
        if (!salesPerformanceData || salesPerformanceData.length === 0) {
            return '0.0%';
        }

        // Group by sale_order_id to count unique orders
        const uniqueOrders = [...new Set(salesPerformanceData.map(sale => sale.sale_order_id))];
        const uniqueValidatedOrders = [...new Set(
            salesPerformanceData
                .filter(sale => sale.state === 'sale')
                .map(sale => sale.sale_order_id)
        )];

        const totalQuotes = uniqueOrders.length;
        const validatedSales = uniqueValidatedOrders.length;
        
        const conversionRate = (validatedSales / totalQuotes) * 100;
        return conversionRate.toFixed(1) + '%';
    }

    getTotalOverdueInvoice(salesPerformanceData) {
        if (!salesPerformanceData) {
            return 0;
        }

        const today = new Date();
        
        // Group by invoice_id first
        const invoiceGroups = salesPerformanceData.reduce((groups, sale) => {
            if (sale.invoice_id && sale.invoice_state === 'posted' && sale.invoice_date_due) {
                const dueDate = new Date(sale.invoice_date_due);
                if (dueDate < today) {
                    if (!groups[sale.invoice_id]) {
                        groups[sale.invoice_id] = {
                            invoice_amount_residual: sale.invoice_amount_residual
                        };
                    }
                }
            }
            return groups;
        }, {});

        // Sum up residual amounts from grouped invoices
        const total = Object.values(invoiceGroups)
            .filter(invoice => invoice.invoice_amount_residual > 0)
            .reduce((total, invoice) => total + invoice.invoice_amount_residual, 0);

        return total.toLocaleString('en-US', {
            style: 'currency',
            currency: this.state.currency.currency_name, 
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
    }


    getTotalValidatedInvoice(salesPerformanceData) {
        if (!salesPerformanceData) {
            return 0;
        }
        const invoiceGroups = salesPerformanceData.reduce((groups, sale) => {
            if (sale.invoice_id && sale.invoice_state === 'posted') {
                if (!groups[sale.invoice_id]) {
                    groups[sale.invoice_id] = {
                        invoice_amount: sale.invoice_amount
                    };
                }
            }
            return groups;
        }, {});

        // Sum up amounts from grouped invoices
        const total = Object.values(invoiceGroups)
            .reduce((total, invoice) => total + invoice.invoice_amount, 0);
        return total.toLocaleString('en-US', {
            style: 'currency', 
            currency: this.state.currency.currency_name,
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
    }

    getAverageSaleOrder(salesPerformanceData) {
        if (!salesPerformanceData || salesPerformanceData.length === 0) {
            return 0;
        }

        // Group sales by order ID to avoid counting line items separately
        const orderGroups = salesPerformanceData.reduce((groups, sale) => {
            if (sale.sale_order_id && sale.state === 'sale') {
                if (!groups[sale.sale_order_id]) {
                    groups[sale.sale_order_id] = {
                        total_amount: 0
                    };
                }
                groups[sale.sale_order_id].total_amount += sale.amount;
            }
            return groups;
        }, {});

        const orders = Object.values(orderGroups);
        if (orders.length === 0) {
            return 0;
        }

        const totalAmount = orders.reduce((sum, order) => sum + order.total_amount, 0);
        const average = totalAmount / orders.length;

        return average.toLocaleString('en-US', {
            style: 'currency',
            currency: this.state.currency.currency_name,
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
    }

    async getAverageSaleOrderByTimeGroup(salesPerformanceData, timeGroup) {
        if (!salesPerformanceData || salesPerformanceData.length === 0) {
            return [];
        }

        const groupSales = (salesPerformanceData, groupByFunc) => {
            return salesPerformanceData.reduce((groups, sale) => {
                if (sale.sale_order_id && sale.state === 'sale') {
                    const groupKey = groupByFunc(new Date(sale.date));
                    if (!groups[groupKey]) {
                        groups[groupKey] = {
                            totalAmount: 0,
                            orderCount: 0
                        };
                    }
                    groups[groupKey].totalAmount += sale.amount;
                    groups[groupKey].orderCount += 1;
                }
                return groups;
            }, {});
        };

        const calculateAverage = (salesGroups, getStartDateFunc) => {
            return Object.keys(salesGroups).map(groupKey => {
                const groupData = salesGroups[groupKey];
                const average = groupData.totalAmount / groupData.orderCount;
                const startDate = getStartDateFunc(groupKey, new Date().getFullYear());
                return {
                    date: startDate.getTime(),
                    averageSaleOrder: average
                };
            });
        };

        let salesGroups;
        let getStartDateFunc;

        switch (timeGroup) {
            case 'weekly':
                salesGroups = groupSales(salesPerformanceData, this.getWeekNumber);
                getStartDateFunc = this.getStartDateOfWeek;
                break;
            case 'monthly':
                salesGroups = groupSales(salesPerformanceData, date => date.getMonth() + 1);
                getStartDateFunc = (month, year) => new Date(year, month - 1, 1);
                break;
            case 'quarterly':
                salesGroups = groupSales(salesPerformanceData, date => Math.floor(date.getMonth() / 3) + 1);
                getStartDateFunc = (quarter, year) => new Date(year, (quarter - 1) * 3, 1);
                break;
            default:
                throw new Error("Invalid time group. Please use 'weekly', 'monthly', or 'quarterly'.");
        }

        return calculateAverage(salesGroups, getStartDateFunc);
    }

    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    getStartDateOfWeek(weekNumber, year) {
        const firstDayOfYear = new Date(year, 0, 1);
        const daysOffset = (weekNumber - 1) * 7;
        const startDate = new Date(firstDayOfYear.setDate(firstDayOfYear.getDate() + daysOffset));
        const dayOfWeek = startDate.getDay();
        const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(startDate.setDate(diff));
    }

    getTop3ProductsBySales(salesPerformanceData) {
        if (!salesPerformanceData || salesPerformanceData.length === 0) {
            return [];
        }
        // Aggregate sales data by product
        const productSales = salesPerformanceData.reduce((products, sale) => {
            if (sale.product_name) {
                // Attempt to get the product name using 'en_US', otherwise pick any available key
                const productName = sale.product_name['en_US'] || Object.values(sale.product_name)[0];
                if (!products[productName]) {
                    products[productName] = {
                        totalQuantity: 0,
                        totalValue: 0
                    };
                }
                products[productName].totalQuantity += sale.quantity;
                products[productName].totalValue += sale.amount;
            }
            return products;
        }, {});

        // Convert the aggregated data to an array
        const productSalesArray = Object.keys(productSales).map(productName => ({
            product: productName,
            totalValue: productSales[productName].totalValue,
            totalQuantity: productSales[productName].totalQuantity
        }));

        // Sort the array by total value and total quantity
        const top3ProductsByValue = productSalesArray.slice().sort((a, b) => b.totalValue - a.totalValue).slice(0, 3);
        const top3ProductsByQuantity = productSalesArray.slice().sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 3);

        return {
            top3ProductsByValue,
            top3ProductsByQuantity
        };
    }
    
    getCustomerList(salesPerformanceData) {
        if (!salesPerformanceData || salesPerformanceData.length === 0) {
            return {};
        }

        // Extract unique customers with their IDs from sales performance data
        const customers = salesPerformanceData.reduce((customerMap, sale) => {
            if (sale.customer && sale.customer_id && !customerMap[sale.customer_id]) {
                customerMap[sale.customer_id] = sale.customer;
            }
            return customerMap;
        }, {});
        const formatedCustomerList = Object.keys(customers).map(customerId => ({
            id: customerId,
            name: customers[customerId]
        }));
        return formatedCustomerList;
    }

    getSaleTemporalAnalysis(salesPerformanceData) {
        if (!salesPerformanceData || salesPerformanceData.length === 0) {
            return [];
        }
        const saleTemporalAnalysis = salesPerformanceData.reduce((saleTemporalAnalysisMap, sale) => {
            if(sale.sale_order_id && sale.state === 'sale') {
               if(!saleTemporalAnalysisMap[sale.sale_order_id]) {
                saleTemporalAnalysisMap[sale.sale_order_id] = {
                    amount_untaxed: 0,
                    amount_to_invoice: 0,
                    waiting_for_payment: 0,
                    amount_received: 0,
                    invoice_amount_residual: 0,
                    date_order: sale.date,
                    invoice_date_due: sale.invoice_date_due
                    }
                }
                if(saleTemporalAnalysisMap[sale.sale_order_id].amount_untaxed == 0) {
                    saleTemporalAnalysisMap[sale.sale_order_id].amount_untaxed = sale.amount_untaxed;
                }
                saleTemporalAnalysisMap[sale.sale_order_id].amount_to_invoice += sale.amount_to_invoice;
                saleTemporalAnalysisMap[sale.sale_order_id].waiting_for_payment += sale.waiting_for_payment;
                saleTemporalAnalysisMap[sale.sale_order_id].amount_received += sale.amount_received;
                saleTemporalAnalysisMap[sale.sale_order_id].invoice_amount_residual += sale.invoice_amount_residual;
            }
            return saleTemporalAnalysisMap;
        }, {});
        
        // Then, aggregate by date
        const saleTemporalAnalysisByDate = Object.values(saleTemporalAnalysis).reduce((dateMap, sale) => {
            const dateKey = sale.date_order;
            if (!dateMap[dateKey]) {
                dateMap[dateKey] = {
                    date: dateKey,
                    amount_untaxed: 0,
                    amount_to_invoice: 0,
                    waiting_for_payment: 0,
                    amount_received: 0,
                    invoice_amount_residual: 0,
                    overdue: 0
                };
            }
            
            dateMap[dateKey].amount_untaxed += sale.amount_untaxed;
            dateMap[dateKey].amount_to_invoice += sale.amount_to_invoice;
            dateMap[dateKey].waiting_for_payment += sale.waiting_for_payment;
            dateMap[dateKey].amount_received += sale.amount_received;
            dateMap[dateKey].invoice_amount_residual += sale.invoice_amount_residual;
            
            // Check if invoice is overdue
            if (sale.invoice_date_due) {
                const today = new Date();
                const dueDate = new Date(sale.invoice_date_due);
                if (dueDate < today) {
                    dateMap[dateKey].overdue += sale.invoice_amount_residual;
                }
            }
            return dateMap;
        }, {});
        const sortedSaleTemporalAnalysisByDate = Object.values(saleTemporalAnalysisByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
        return sortedSaleTemporalAnalysisByDate;
    }

    getCategoryProductHierarchy(salesPerformanceData) {
        if (!salesPerformanceData || salesPerformanceData.length === 0) {
            return [];
        }
        const categoryList = salesPerformanceData.reduce((categoryMap, sale) => {
            if (sale.product_category && sale.state === 'sale') {
                if (!categoryMap[sale.product_category]) {
                    categoryMap[sale.product_category] = {
                       "name": sale.product_category,
                       "children": []
                    };
                }
                if(!categoryMap[sale.product_category].children.find(child => child.name === Object.values(sale.product_name)[0])) {
                    categoryMap[sale.product_category].children.push({
                        "name": Object.values(sale.product_name)[0],
                        "quantity": 0,
                    });
                }
                categoryMap[sale.product_category].children.findIndex((child) =>{
                    if(child.name === Object.values(sale.product_name)[0]) {
                        child.quantity += sale.quantity;
                    }
                })
            }
            return categoryMap;
        }, {});
        const formattedCategoryList = Object.values(categoryList).map(category => {
            return{
                name: category.name,
                children: category.children
            };
        });
        return formattedCategoryList;
    }

    getTotalAmountBySalesperson(salesPerformanceData) {
        if (!salesPerformanceData || salesPerformanceData.length === 0) {
            return [];
        }

        // Aggregate total amount by salesperson, filtering only data with sale status
        const salespersonTotals = salesPerformanceData.reduce((salespersonMap, sale) => {
            if (sale.salesperson && sale.state === 'sale') {
                if (!salespersonMap[sale.salesperson]) {
                    salespersonMap[sale.salesperson] = 0;
                }
                salespersonMap[sale.salesperson] += sale.amount;
            }
            return salespersonMap;
        }, {});

        // Convert the aggregated data to the desired format and sort by highest amount
        const formattedData = Object.keys(salespersonTotals).map(salesperson => ({
            salesperson: salesperson,
            value: salespersonTotals[salesperson]
        })).sort((a, b) => b.value - a.value);

        return formattedData;
    }

    getTotalSaleOrderIdBySalesperson(salesPerformanceData) {
        if (!salesPerformanceData || salesPerformanceData.length === 0) {
            return [];
        }

        // Aggregate total sale_order_id by salesperson, filtering only data with sale status
        const salespersonOrderIds = salesPerformanceData.reduce((salespersonMap, sale) => {
            if (sale.salesperson && sale.state === 'sale') {
                if (!salespersonMap[sale.salesperson]) {
                    salespersonMap[sale.salesperson] = new Set();
                }
                salespersonMap[sale.salesperson].add(sale.sale_order_id);
            }
            return salespersonMap;
        }, {});

        // Convert the aggregated data to the desired format
        const formattedData = Object.keys(salespersonOrderIds).map(salesperson => ({
            salesperson: salesperson,
            value: Array.from(salespersonOrderIds[salesperson]).length
        })).sort((a, b) => b.value - a.value);

        return formattedData;
    }

    async getSalesPerformanceData() {
        try {
            await rpc("/web/dataset/call_kw/sales.dashboard/get_sales_performance_data", {
                model: "sales.dashboard",
                method: "get_sales_performance_data",
                args: [[], this.state.dateFrom, this.state.dateTo, this.state.customerIds, this.state.productIds, this.state.productCategoryIds],
                kwargs: {}
            }).then(res => {
                this.state.currency = res[1];
                this.state.salesPerformanceData = res[0];
                this.state.totalSalesValidatedAmount = this.getTotalSalesValidatedAmount(res[0]);
                this.state.quoteToOrderConversionRate = this.getQuoteToOrderConversionRate(res[0]);
                this.state.totalValidatedInvoice = this.getTotalValidatedInvoice(res[0]);
                this.state.totalOverdueInvoice = this.getTotalOverdueInvoice(res[0]);
                this.state.averageSaleOrder = this.getAverageSaleOrder(res[0]);
                this.state.top3ProductsBySales = this.getTop3ProductsBySales(res[0]);
                this.state.totalAmountBySalesperson = this.getTotalAmountBySalesperson(res[0]);
                this.state.totalSaleOrderIdBySalesperson = this.getTotalSaleOrderIdBySalesperson(res[0]);
                this.state.categoryProductHierarchy = this.getCategoryProductHierarchy(res[0]);
                this.state.saleTemporalAnalysis = this.getSaleTemporalAnalysis(res[0]);
            });
        } catch (error) {
            console.log(error);
        }
    }
    async getProductDatas() {
        try {
            await rpc("/web/dataset/call_kw/sales.dashboard/get_product_datas", {
                model: "sales.dashboard",
                method: "get_product_datas",
                args: [[]],
                kwargs: {}
            }).then(res => {
                const products = res.reduce((productMap, product) => {
                    productMap[product.product_id] = product.product_name['en_US'] || Object.values(product.product_name)[0];;
                    return productMap;
                }, {});
                const formatedProductsList = Object.keys(products).map(productId => ({
                    id: productId,
                    name: products[productId]
                }));
                this.state.products = formatedProductsList
            });
        } catch (error) {
            console.log(error);
        }
    }

    async getProductCategoryDatas() {
        try {
            await rpc("/web/dataset/call_kw/sales.dashboard/get_product_category_datas", {
                model: "sales.dashboard",
                method: "get_product_category_datas",
                args: [[]],
                kwargs: {}
            }).then(res => {
                const productCategories= res.reduce((categoryMap, category) => {
                    categoryMap[category.product_category_id] = category.product_category_name;
                    return categoryMap;
                }, {});
                const formatedProductCategoryList = Object.keys(productCategories).map(productCategoryId => ({
                    id: productCategoryId,
                    name: productCategories[productCategoryId]
                }));
                this.state.productCategories = formatedProductCategoryList
            });
        } catch (error) {
            console.log(error);
        }
    }

    async onClickValidatedSalesOrder() {

        let listView = await this.orm.searchRead("ir.model.data", [["name", "=", "sale_order_list_upload"]], ["res_id"])

        this.action.doAction({
            type: "ir.actions.act_window",
            name: "Validated Sales Orders",
            res_model: "sale.order",
            views: [
                [listView.length > 0 ? listView[0].res_id : false, "list"],
                [false, "form"]
            ],
            domain: [
                ["state", "=", "sale"],
                ["date_order", ">=", this.state.dateFrom],
                ["date_order", "<=", this.state.dateTo]
            ],
            target: "current"
        })
    }

    async onClickValidatedInvoice() {
        let listView = await this.orm.searchRead("ir.model.data", [["name", "=", "view_out_invoice_tree"]], ["res_id"])

        this.action.doAction({
            type: "ir.actions.act_window",
            name: "Validated Invoices",
            res_model: "account.move",
            views: [
                [listView.length > 0 ? listView[0].res_id : false, "list"],
                [false, "form"]
            ],
            domain: [
                ["state", "=", "posted"],
                ["move_type", "=", "out_invoice"],
                ["invoice_origin", "!=", false],
                "&",
                    ["invoice_line_ids.sale_line_ids.order_id.date_order", ">=", this.state.dateFrom],
                    ["invoice_line_ids.sale_line_ids.order_id.date_order", "<=", this.state.dateTo]
            ],
            target: "current"
        })
    }

    async onClickTotalOverdueInvoice() {
        let listView = await this.orm.searchRead("ir.model.data", [["name", "=", "view_out_invoice_tree"]], ["res_id"])

        this.action.doAction({
            type: "ir.actions.act_window",
            name: "Total Overdue Invoice",
            res_model: "account.move",
            views: [
                [listView.length > 0 ? listView[0].res_id : false, "list"],
                [false, "form"]
            ],
            domain: [
                ["state", "=", "posted"],
                ["move_type", "=", "out_invoice"],
                ["invoice_origin", "!=", false],
                ["payment_state", "in", ["not_paid", "partial"]],
                ["invoice_date_due", "<", DateTime.now().toISODate()],
                "&",
                    ["invoice_line_ids.sale_line_ids.order_id.date_order", ">=", this.state.dateFrom],
                    ["invoice_line_ids.sale_line_ids.order_id.date_order", "<=", this.state.dateTo]
            ],
            target: "current"
        })
    }
}

registry.category('actions').add('sales_performance_dashboard', SalesPerformanceDashboard);