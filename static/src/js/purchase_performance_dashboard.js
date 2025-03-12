import { Component, useState, useRef, onMounted, onWillStart } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { rpc } from "@web/core/network/rpc";
import { KPI } from "@Dashboard-Doodex/components/KPIs/kpi";
import { Graph } from "@Dashboard-Doodex/components/graph";
const { DateTime } = luxon;

export class PurchasePerformanceDashboard extends Component {
    static template = "PurchasePerformanceDashboard";
    static components = {
        KPI
    };

    setup() {
        this.root = useRef("root");
        this.productCategoryDropdownRef = useRef("productCategoryDropdown");
        this.supplierDropdownRef = useRef("supplierDropdown");
        this.graph = new Graph(this.root);
        this.state = useState({
            dateFrom: DateTime.now().startOf('month').toISODate(),
            dateTo: DateTime.now().endOf('month').toISODate(),
            dateFilterHeader: "This Month",
            
            isProductCategoryDropdownOpen: false,
            isSupplierDropdownOpen: false,

            productCategories: [],
            productCategoryIds: [],
            filteredProductCategories: [],
            selectedProductCategories: [],
            productCategorySearchText: "",
            productCategoryNameHeader: "All",
            
            suppliers: [],
            supplierIds: [],
            filteredSuppliers: [],
            selectedSuppliers: [],
            supplierSearchText: "",
            supplierNameHeader: "All",
            
            totalPurchaseVolume: "0.00",
            avarageLeadTime: "1 days",
            otifDeliveryRate: "0.00",
            averageCostPerUnit: "0.00",
            purchaseTrend: [],
            supplierPerformanceData: []
        })

        onWillStart(async () => {
            await this.getPurchasePerformanceData();
            await this.getProductCategoryDatas();
        })

        onMounted(async () => {
            this.state.suppliers = this.getSupplierList(this.state.purchasePerformanceData);
            this.state.filteredSuppliers = [...this.state.suppliers];
            this.state.filteredProductCategories = this.state.productCategories.filter(category => category.name !== "All");
            console.log(this.state);
            this.graph.renderMultiLineChart(this.state.purchaseTrend, '#purchase-trends-by-product-category', this.state.dateFilterHeader);
            this.graph.renderCategoryChart(this.state.supplierPerformanceData, '#supplier-performance');
        })
    }

    onGlobalClick(ev){
        if (this.state.isSupplierDropdownOpen && 
            this.supplierDropdownRef.el && 
            !this.supplierDropdownRef.el.contains(ev.target)) {
            this.state.isSupplierDropdownOpen = false;
        }
        if (this.state.isProductCategoryDropdownOpen && 
            this.productCategoryDropdownRef.el && 
            !this.productCategoryDropdownRef.el.contains(ev.target)) {
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
            'supplier',
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
        if (optionType === 'Suppliers') {
            this.state.supplierIds = this.state[selectedArray].map(item => item.id);
            this.onSupplierSelect();
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
        if (filterType === 'suppliers') {
            this.state.supplierIds = [];
            this.onSupplierSelect();
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
            if (filterType === 'suppliers') {
                this.state.supplierIds = this.state[selectedArray].map(item => item.id);
            } else if(filterType === 'productCategories'){
                this.state.productCategoryIds = this.state[selectedArray].map(item => item.id);
            }
        } else {
            // If not searching, select all options
            this.state[selectedArray] = [...this.state[optionsArray]];
            if (filterType === 'suppliers') {
                this.state.supplierIds = this.state[selectedArray].map(item => item.id);
            } else if(filterType === 'productCategories'){
                this.state.productCategoryIds = this.state[selectedArray].map(item => item.id);
            }
        }
        if (filterType === 'suppliers') {
            this.onSupplierSelect();
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

    onClickSupplierOption = () => { this.handleDropdownClick('supplier') }
    onClickProductCategoryOption = () => { this.handleDropdownClick('productCategory') }

    async onDateFilterSelect(dateFilter) {
        this.state.dateFilterHeader = dateFilter;
        const today = DateTime.now();
        if (dateFilter === "This Month") {
            this.state.dateFrom = today.startOf('month').toISODate();
            this.state.dateTo = today.endOf('month').toISODate();
        } else if (dateFilter === "This Quarter") {
            const currentQuarter = Math.floor(today.month / 3);
            this.state.dateFrom = today.startOf('quarter').toISODate();
            this.state.dateTo = today.endOf('quarter').toISODate();
        } else if (dateFilter === "This Financial Year") {
            this.state.dateFrom = today.startOf('year').toISODate();
            this.state.dateTo = today.endOf('year').toISODate();
        } else if (dateFilter === "Last Month") {
            this.state.dateFrom = today.startOf('month').minus({ month: 1 }).toISODate();
            this.state.dateTo = today.endOf('month').minus({ month: 1 }).toISODate();
        } else if (dateFilter === "Last Quarter") {
            const lastQuarter = Math.floor((today.month - 3) / 3);
            this.state.dateFrom = today.startOf('quarter').minus({ quarter: 1 }).toISODate();
            this.state.dateTo = today.endOf('quarter').minus({ quarter: 1 }).toISODate();
        } else if (dateFilter === "Last Financial Year") {
            this.state.dateFrom = today.startOf('year').minus({ year: 1 }).toISODate();
            this.state.dateTo = today.endOf('year').minus({ year: 1 }).toISODate();
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
        }
        await this.getPurchasePerformanceData();
        this.graph.renderMultiLineChart(this.state.purchaseTrend, '#purchase-trends-by-product-category', this.state.dateFilterHeader);
        this.graph.renderCategoryChart(this.state.supplierPerformanceData, '#supplier-performance');
    }

    async onSupplierSelect() {
        await this.getPurchasePerformanceData();
        this.graph.renderMultiLineChart(this.state.purchaseTrend, '#purchase-trends-by-product-category', this.state.dateFilterHeader);
        this.graph.renderCategoryChart(this.state.supplierPerformanceData, '#supplier-performance');
    }

    async onProductCategorySelect() {
        await this.getPurchasePerformanceData();
        this.graph.renderMultiLineChart(this.state.purchaseTrend, '#purchase-trends-by-product-category', this.state.dateFilterHeader);
        this.graph.renderCategoryChart(this.state.supplierPerformanceData, '#supplier-performance');
    }

    async getPurchasePerformanceData() {
        try {
            await rpc("/web/dataset/call_kw/purchase.dashboard/get_purchase_performance_data", {
                model: "purchase.dashboard",
                method: "get_purchase_performance_data",
                args: [this.state.dateFrom, this.state.dateTo, this.state.productCategoryIds, this.state.supplierIds],
                kwargs: {}
            }).then(res => {
                this.state.currency = res[1];
                this.state.purchasePerformanceData = res[0];
                this.state.totalPurchaseVolume = this.getTotalPurchaseVolume(res[0]);
                this.state.avarageLeadTime = this.getAverageLeadTime(res[0]);
                this.state.otifDeliveryRate = this.getOTIFDeliveryRate(res[0]);
                this.state.averageCostPerUnit = this.getAverageCostPerUnit(res[0]);
                this.state.purchaseTrend = this.getPurchaseTrend(res[0]);
                this.state.supplierPerformanceData = this.getSupplierPerformanceData(res[0]);
            })
        } catch (error) {
            console.error(error);
        }
    }

    async getProductCategoryDatas() {
        try {
            await rpc("/web/dataset/call_kw/purchase.dashboard/get_product_category_datas", {
                model: "purchase.dashboard",
                method: "get_product_category_datas",
                args: [],
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
            })
        } catch (error) {
            console.error(error);
        }
    }

    getSupplierList(purchasePerformanceData) {
        if (!purchasePerformanceData || purchasePerformanceData.length === 0) {
            return {};
        }

        // Extract unique customers with their IDs from sales performance data
        const suppliers = purchasePerformanceData.reduce((supplierMap, purchase) => {
            if (purchase.vendor && purchase.vendor_id && !supplierMap[purchase.vendor_id]) {
                supplierMap[purchase.vendor_id] = purchase.vendor;
            }
            return supplierMap;
        }, {});
        const formatedSupplierList = Object.keys(suppliers).map(supplierId => ({
            id: supplierId,
            name: suppliers[supplierId]
        }));
        return formatedSupplierList;
    }
    
    getTotalPurchaseVolume(purchasePerformanceData) {
        if (!purchasePerformanceData || purchasePerformanceData.length === 0) {
            return "0.00";
        }

        const totalPurchaseVolumeGroups = purchasePerformanceData.reduce((groups, purchase) => {
            if (purchase.purchase_order_id && purchase.state === 'purchase') {
                if (!groups[purchase.purchase_order_id]) {
                    groups[purchase.purchase_order_id] = {
                        total_amount: 0,
                    };
                }
                groups[purchase.purchase_order_id].total_amount += purchase.amount;
            }
            return groups;
        }, {});

        const totalPurchaseVolume = Object.values(totalPurchaseVolumeGroups).reduce((total, group) => {
            return total + group.total_amount;
        }, 0);
        return totalPurchaseVolume.toLocaleString('en-US', {
            style: 'currency',
            currency: this.state.currency.currency_name,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    getAverageLeadTime(purchasePerformanceData) {
        if (!purchasePerformanceData || purchasePerformanceData.length === 0) {
            return "0.00";
        }

        const validPurchases = purchasePerformanceData.filter(purchase => 
            purchase.state === 'purchase' && 
            purchase.arrival_date && 
            purchase.date_order
        );

        if (validPurchases.length === 0) {
            return "0.00";
        }

        const totalLeadTime = validPurchases.reduce((total, purchase) => {
            const arrivalDate = DateTime.fromISO(purchase.arrival_date);
            const orderDate = DateTime.fromISO(purchase.date_order);
            const leadTime = arrivalDate.diff(orderDate, 'days').days;
            return total + leadTime;
        }, 0);

        const averageLeadTime = totalLeadTime / validPurchases.length;
        return averageLeadTime.toFixed(2) + " days";
    }
    
    getOTIFDeliveryRate(purchasePerformanceData) {
        if (!purchasePerformanceData || purchasePerformanceData.length === 0) {
            return "0.00";
        }
        
        const validPurchases = purchasePerformanceData.filter(purchase => 
            purchase.state === 'purchase' && 
            purchase.arrival_date && 
            purchase.expected_arrival
        );

        if (validPurchases.length === 0) {
            return "0.00";
        }
        
        const otifPurchases = validPurchases.filter(purchase => {
            const actualArrival = DateTime.fromISO(purchase.arrival_date);
            const expectedArrival = DateTime.fromISO(purchase.expected_arrival);
            
            // Check if delivery was on time (actual arrival <= expected arrival)
            const isOnTime = actualArrival <= expectedArrival;
            
            // Check if delivery was in full (assuming a field that indicates full receipt)
            // If there's no specific field, you might need to adjust this logic
            const isInFull = purchase.is_fully_received || purchase.receipt_status === 'full';
            
            return isOnTime && isInFull;
        });

        const otifRate = (otifPurchases.length / validPurchases.length) * 100;
        return otifRate.toFixed(2) + "%";
    }

    getAverageCostPerUnit(purchasePerformanceData) {
        if (!purchasePerformanceData || purchasePerformanceData.length === 0) {
            return "0.00";
        }
        
        const validPurchases = purchasePerformanceData.filter(purchase => 
            purchase.state === 'purchase' && 
            purchase.receipt_status === null && 
            purchase.arrival_date === null
        );

        if (validPurchases.length === 0) {
            return "0.00";
        }

        const totalCost = validPurchases.reduce((total, purchase) => {
            return total + purchase.amount + purchase.tax;
        }, 0);

        const averageCostPerUnit = totalCost / validPurchases.length;
        return averageCostPerUnit.toLocaleString('en-US', {
            style: 'currency',
            currency: this.state.currency.currency_name,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }
    
    getPurchaseTrend(purchasePerformanceData) {
        if (!purchasePerformanceData || purchasePerformanceData.length === 0) {
            return [];
        }
        
        const allCategories = new Set();
        purchasePerformanceData.forEach(purchase => {
            if (purchase.complete_product_category && purchase.state === 'purchase') {
                allCategories.add(purchase.complete_product_category);
            }
        });

        // First, group by date and then by category
        const dateMap = {};
        
        purchasePerformanceData.forEach(purchase => {
            if (purchase.complete_product_category && purchase.state === 'purchase') {
                // Extract date part only (yyyy-mm-dd)
                const dateOnly = purchase.date_order
                
                if (!dateMap[dateOnly]) {
                    dateMap[dateOnly] = {};
                    allCategories.forEach(category => {
                        dateMap[dateOnly][category] = 0;
                    });
                }
                
                if (purchase.complete_product_category) {
                    dateMap[dateOnly][purchase.complete_product_category] += purchase.amount;
                }
            }
        });
        
        // Convert to the required format
        const result = Object.keys(dateMap).map(date => {
            const dateEntry = { date };
            
            // Add each category as a property
            allCategories.forEach(category => {
                dateEntry[category] = dateMap[date][category] || 0;
            });
            
            return dateEntry;
        });
        
        // Sort by date
        result.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        return result;
    }

    getSupplierPerformanceData(purchasePerformanceData) {
        if (!purchasePerformanceData || purchasePerformanceData.length === 0) {
            return [];
        }

        const supplierData = {};

        purchasePerformanceData.forEach(purchase => {
            if (purchase.state === 'purchase' && purchase.vendor_id) {
                if (!supplierData[purchase.vendor_id]) {
                    supplierData[purchase.vendor_id] = {
                        supplier: purchase.vendor,
                        totalCost: 0,
                        totalOrders: 0,
                        totalLeadTime: 0,
                        validLeadTimeOrders: 0,
                        totalQualityScore: 0,

                    };
                }

                // Calculate cost metrics
                supplierData[purchase.vendor_id].totalCost += purchase.amount;
                supplierData[purchase.vendor_id].totalQualityScore += purchase.quality_score;
                supplierData[purchase.vendor_id].totalOrders += 1;

                // Calculate lead time metrics
                if (purchase.arrival_date && purchase.date_order) {
                    const arrivalDate = DateTime.fromISO(purchase.arrival_date);
                    const orderDate = DateTime.fromISO(purchase.date_order);
                    const leadTime = arrivalDate.diff(orderDate, 'days').days;
                    
                    supplierData[purchase.vendor_id].totalLeadTime += leadTime;
                    supplierData[purchase.vendor_id].validLeadTimeOrders += 1;
                }
            }
        });

        const result = Object.values(supplierData).map(supplier => {
            // Calculate average cost per order
            const avgCost = supplier.totalOrders > 0 ? 
                supplier.totalCost / supplier.totalOrders : 0;
            
            // Calculate average lead time
            const avgLeadTime = supplier.validLeadTimeOrders > 0 ? 
                supplier.totalLeadTime / supplier.validLeadTimeOrders : 0;
            
            // Calculate quality score (based on percentage of on-time and in-full deliveries)
            // Quality score is on a scale of 0-100
            const qualityScore = supplier.totalQualityScore > 0 ? 
                ((supplier.totalQualityScore) / (supplier.totalOrders)) : 0;
            
            return {
                supplier: supplier.supplier,
                cost: parseFloat(avgCost.toFixed(2)),
                leadTime: parseFloat(avgLeadTime.toFixed(0)),
                quality: parseFloat(qualityScore.toFixed(0))
            };
        });

        return result;
    }
}

registry.category('actions').add('purchase_performance_dashboard', PurchasePerformanceDashboard);