/* global owl:readonly */
import { isMobileOS } from "@web/core/browser/feature_detection";
import { Component, useState, useRef, onMounted,onWillStart } from "@odoo/owl";

import { rpc } from "@web/core/network/rpc";
import { DashboardController } from "@Dashboard-Doodex/components/controller";

export class Graph{
    constructor(root){
        this.root = root;
        this.dashboardController = new DashboardController();
        this.options = useState(this.dashboardController)
    }

    async initChart(referenceId) {
        const ref = this.root.el.querySelector(referenceId);
        if (ref._root) {
            ref._root.dispose();
            ref._root = null;
        }
        var root = am5.Root.new(ref);
        ref._root = root;
        root.setThemes([am5themes_Animated.new(root)]);
        return root;
    }

    /**
     * Render line charts
     * @param {array} data - The data to render
     * Expected data format:
     * [
     *   {
     *     period: Integer of the period,
     *     purchase: Float of the purchase amount,
     *     sales: Float of the sales amount
     *   },
     *   ...
     * ]
     */
    async renderLineCharts(data) {
      const root = await this.initChart("#sales_purchase_evolution");
      var chart = root.container.children.push( 
        am5xy.XYChart.new(root, {
          panY: false,
          wheelY: "zoomX",
          layout: root.verticalLayout,
          maxTooltipDistance: 0
        }) 
      );

      // Create Y-axis
      var yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          extraTooltipPrecision: 1,
          renderer: am5xy.AxisRendererY.new(root, {})
        })
      );
      
      // Create X-Axis
      var xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
          categoryField: "period",
          renderer: am5xy.AxisRendererX.new(root, {
            minGridDistance: 20
          }),
        })
      );
      xAxis.data.setAll(data);
      
      // Create series
      
      var series = chart.series.push(
        am5xy.LineSeries.new(root, {
          name: "Sales",
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: "sales",
          categoryXField: "period",
          legendLabelText: "{name}: {categoryX}",
          legendRangeLabelText: "{name}",
          stroke: "#2563eb",
          fill: "#2563eb"
        })
      );
        
      series.data.setAll(data);

      var series2 = chart.series.push(
        am5xy.LineSeries.new(root, {
          name: "Purchase",
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: "purchase",
          categoryXField: "period",
          legendLabelText: "{name}: {categoryX}",
          legendRangeLabelText: "{name}",
          stroke: "#22c55e",
          fill: "#22c55e"
        })
      );

      series2.data.setAll(data);
      // Add cursor
      chart.set("cursor", am5xy.XYCursor.new(root, {
        behavior: "zoomXY",
        xAxis: xAxis
      }));
      
      xAxis.set("tooltip", am5.Tooltip.new(root, {
        themeTags: ["axis"]
      }));
      
      yAxis.set("tooltip", am5.Tooltip.new(root, {
        themeTags: ["axis"]
      }));
      
      var legend = chart.children.push(am5.Legend.new(root, {}));
      legend.data.setAll(chart.series.values);
    }

    async renderComboCharts() {
        const root = await this.initChart("#distribution");
        var chart = root.container.children.push(
            am5xy.XYChart.new(root, {
              panX: false,
              panY: false,
              wheelX: "panX",
              wheelY: "zoomX",
              paddingLeft: 0,
              layout: root.verticalLayout
            })
          );
          
          var data = [
            {
              year: "2016",
              stock: 23.5,
              crm: 21.1,
              bfr: 1200
            },
            {
              year: "2017",
              stock: 26.2,
              crm: 30.5,
              bfr: 1500
            },
            {
              year: "2018",
              stock: 30.1,
              crm: 34.9,
              bfr: 1800
            },
            {
              year: "2019",
              stock: 29.5,
              crm: 31.1,
              bfr: 1150
            },
            {
              year: "2020",
              stock: 30.6,
              crm: 28.2,
              bfr: 1680
            },
          ];
          
          // Create axes
          // https://www.amcharts.com/docs/v5/charts/xy-chart/axes/
          var xRenderer = am5xy.AxisRendererX.new(root, {
            minorGridEnabled: true,
            minGridDistance: 60
          });
          var xAxis = chart.xAxes.push(
            am5xy.CategoryAxis.new(root, {
              categoryField: "year",
              renderer: xRenderer,
              tooltip: am5.Tooltip.new(root, {})
            })
          );
          xRenderer.grid.template.setAll({
            location: 1
          })
          
          xAxis.data.setAll(data);
          
          //Left Axis
          var yAxis = chart.yAxes.push(
            am5xy.ValueAxis.new(root, {
              min: 0,
              extraMax: 0.1,
              renderer: am5xy.AxisRendererY.new(root, {
                strokeOpacity: 0.1
              })
            })
          );

          //Right Axis
          var yAxis2 = chart.yAxes.push(
            am5xy.ValueAxis.new(root, {
              min: 0,
              extraMax: 0.1,
              renderer: am5xy.AxisRendererY.new(root, {
                opposite: true,
                strokeOpacity: 0.1
              })
            })
          );
          
          function makeBarSeries(name, fieldName, color){
            var series = chart.series.push(
              am5xy.ColumnSeries.new(root, {
                name: name,
                xAxis: xAxis,
                yAxis: yAxis,
                valueYField: fieldName,
                categoryXField: "year",
                tooltip: am5.Tooltip.new(root, {
                  pointerOrientation: "horizontal",
                  labelText: "{name} in {categoryX}: {valueY} {info}"
                }),
                fill: color,
                stroke: color
              })
            );
            
            series.columns.template.setAll({
              tooltipY: am5.percent(10),
              templateField: "columnSettings"
            });
            
            series.data.setAll(data);
            series.appear();
          } 
          
          makeBarSeries("Stock", "stock", "#f97316");
          makeBarSeries("CRM", "crm", "#ef4444");
          
          var series2 = chart.series.push(
            am5xy.LineSeries.new(root, {
              name: "BFR",
              xAxis: xAxis,
              yAxis: yAxis2,
              valueYField: "bfr",
              categoryXField: "year",
              tooltip: am5.Tooltip.new(root, {
                pointerOrientation: "horizontal",
                labelText: "{name} in {categoryX}: {valueY} {info}"
              }),
              stroke: "#7c3aed",
              fill: "#7c3aed"
            })
          );
          
          series2.strokes.template.setAll({
            strokeWidth: 3,
            templateField: "strokeSettings"
          });
          
          
          series2.data.setAll(data);
          
          series2.bullets.push(function () {
            return am5.Bullet.new(root, {
              sprite: am5.Circle.new(root, {
                strokeWidth: 3,
                stroke: series2.get("stroke"),
                radius: 5,
                fill: root.interfaceColors.get("background")
              })
            });
          });
          
          chart.set("cursor", am5xy.XYCursor.new(root, {}));
          
          // Add legend
          // https://www.amcharts.com/docs/v5/charts/xy-chart/legend-xy-series/
          var legend = chart.children.push(
            am5.Legend.new(root, {
              centerX: am5.p50,
              x: am5.p50
            })
          );
          legend.data.setAll(chart.series.values);
          
          // Make stuff animate on load
          // https://www.amcharts.com/docs/v5/concepts/animations/
          chart.appear(1000, 100);
    }

    generateSeriesData(resultData, series) {
        // Initialize an empty array to hold the series data
        var seriesData = [];
        // Group data by type, then by product type, and then by product_id
        var groupedData = resultData.reduce((acc, item) => {
            if (!acc[item.type]) {
                acc[item.type] = {
                    type: item.type,
                    percent: 0, // This will be calculated later
                    color: null, // Assign colors as needed
                    subs: [],
                    currency_symbol: item.currency_symbol
                };
            }
            let subIndex = acc[item.type].subs.findIndex(sub => sub.type === item.product_type);
            if (subIndex === -1) {
                acc[item.type].subs.push({
                    type: item.product_type,
                    percent: 0, // This will be adjusted to a percentage later
                    products: [],
                    currency_symbol: item.currency_symbol
                });
                subIndex = acc[item.type].subs.length - 1;
            }
            let productIndex = acc[item.type].subs[subIndex].products.findIndex(product => product.id === item.product_id);
            if (productIndex === -1) {
                acc[item.type].subs[subIndex].products.push({
                    id: item.product_id,
                    name: item.product_name,
                    totalAmount: item.amount, // Store the total amount
                    moveLineId: item.move_line_id, // Add move_line_id
                    currency_symbol: item.currency_symbol
                });
            } else {
                acc[item.type].subs[subIndex].products[productIndex].totalAmount += item.amount;
            }
            return acc;
        }, {});
    
        // Calculate total amount for percentage calculation
        var totalAmount = resultData.reduce((sum, item) => sum + item.amount, 0);
    
        // Calculate percentages and push to seriesData
        for (var key in groupedData) {
            var group = groupedData[key];
            var groupTotal = group.subs.reduce((sum, sub) => sum + sub.products.reduce((subSum, product) => subSum + product.totalAmount, 0), 0);
            group.percent = (groupTotal / totalAmount) * 100;
    
            // Calculate percentage for each sub-category and product based on the group's total percent
            group.subs.forEach(sub => {
                var subTotal = sub.products.reduce((sum, product) => sum + product.totalAmount, 0);
                sub.percent = (subTotal / groupTotal) * group.percent;
            });

            // Assign color using series
            group.color = series.get("colors").getIndex(seriesData.length);

            seriesData.push(group);
        }
        return seriesData;
    }

    async renderPieCharts(data) {
        const root = await this.initChart("#category_breakdown");
        var chart = root.container.children.push( 
            am5percent.PieChart.new(root, {
              layout: root.verticalLayout
            }) 
          );
          
          // Create series
          var series = chart.series.push(
            am5percent.PieSeries.new(root, {
              valueField: "percent",
              categoryField: "type",
              fillField: "color",
              alignLabels: false
            })
          );
          
          series.slices.template.set("templateField", "sliceSettings");
          series.labels.template.set("radius", 20);

          //hide while mobile
          function visibilityTicks(){
            const smallScreen = window.innerWidth < 768;
            if(smallScreen){
              series.ticks.template.set("forceHidden", true);
              series.labels.template.set("forceHidden", true);
            }
          }

          visibilityTicks();
          window.addEventListener("resize", visibilityTicks);

          // Set up click events
          series.slices.template.events.on("click", function(event) {
            var dataContext = event.target.dataItem.dataContext;
            if (dataContext.sliceSettings && dataContext.sliceSettings.active) {
              // Open a modal when sliceSettings.active is true
              openModal(dataContext);
            }else{
              if (dataContext.id != undefined) {
                selected = dataContext.id;
              } else {
                selected = undefined;
              }
              series.data.setAll(generateChartData());
            }
          });

          // Define data
          // var data = await data;
          var selected;
          var types = this.generateSeriesData(data, series);
          series.data.setAll(generateChartData());
      
          //generate chart data
          function generateChartData() {
            var chartData = [];
            for (var i = 0; i < types.length; i++) {
              if (i == selected) {
                for (var x = 0; x < types[i].subs.length; x++) {
                  chartData.push({
                    parent_type: types[i].type,
                    type: types[i].subs[x].type,
                    percent: types[i].subs[x].percent,
                    color: types[i].color,
                    pulled: true,
                    sliceSettings: {
                      active: true
                    },
                    products: types[i].subs[x].products,
                    move_line_ids: types[i].subs[x].products.map(product => product.moveLineId),
                    currency_symbol: types[i].subs[x].currency_symbol
                  });
                }
              } else {
                chartData.push({
                  type: types[i].type,
                  percent: types[i].percent,
                  color: types[i].color,
                  id: i
                });
              }
            }
            return chartData;
          }

          function openModal(dataContext) {
            // Calculate the total amount sum
            const products = dataContext.products;
            const totalAmountSum = products.reduce((sum, product) => sum + product.totalAmount, 0);
        
            // Format number as monetary (1.002,400)
            const formattedTotalAmountSum = totalAmountSum.toLocaleString("id-ID", { minimumFractionDigits: 2 });
        
            // Open a modal that shows the product names and total amounts in a table
            let modalContent = `
              <div style="margin-bottom: 10px; font-weight: bold;">
                ${dataContext.parent_type} > ${dataContext.type}
              </div>
              <div style="max-height: 400px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead style="position: sticky; top: 0; background: white;">
                    <tr>
                      <th style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Product</th>
                      <th style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: right;">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
            `;
        
            products.forEach(product => {
                const formattedAmount = product.totalAmount.toLocaleString("id-ID", { minimumFractionDigits: 2 });
                modalContent += `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.name}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${dataContext.currency_symbol} ${formattedAmount}</td>
                  </tr>
                `;
            });
            modalContent += `
                  <tr style="position: sticky; bottom: 0; background: white;">
                    <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Total</th>
                    <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: right;">${dataContext.currency_symbol} ${formattedTotalAmountSum}</th>
                  </tr>
                </tbody>
              </table>
            </div>
            `;

            const modal = document.createElement('div');
            modal.innerHTML = modalContent;
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.backgroundColor = 'white';
            modal.style.padding = '20px';
            modal.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
            modal.style.zIndex = '1001'; // Ensure modal is above the overlay
            modal.style.display = 'block';
            modal.style.maxHeight = '80vh'; // Limit modal height to 80% of viewport height
            modal.style.width = '80%'; // Set modal width to 80% of viewport width
            modal.style.maxWidth = '800px'; // Maximum width of 800px

            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            overlay.style.zIndex = '1000'; // Ensure overlay is below the modal
            document.body.appendChild(overlay);
            document.body.appendChild(modal);

            // Close modal and remove overlay on click outside
            overlay.addEventListener('click', function() {
              document.body.removeChild(modal);
              document.body.removeChild(overlay);
            });
          }
    }

    async renderSankeyDiagram() {
        const root = await this.initChart("#monetary_flow");
        var series = root.container.children.push(am5flow.Sankey.new(root, {
            sourceIdField: "from",
            targetIdField: "to",
            valueField: "value",
            paddingRight: 50
          }));
          
          series.nodes.get("colors").set("step", 2);
          
          
          // Set data
          // https://www.amcharts.com/docs/v5/charts/flow-charts/#Setting_data
          series.data.setAll([
            { from: "A", to: "D", value: 10 },
            { from: "B", to: "D", value: 8 },
            { from: "B", to: "E", value: 4 },
            { from: "D", to: "G", value: 5 },
            { from: "D", to: "I", value: 2 },
            { from: "D", to: "H", value: 3 },
            { from: "E", to: "H", value: 4 },
            { from: "G", to: "J", value: 5 },
            { from: "I", to: "J", value: 1 },
            { from: "H", to: "J", value: 9 }
          ]);
          
          
          // Make stuff animate on load
          series.appear(1000, 100);
    }
}