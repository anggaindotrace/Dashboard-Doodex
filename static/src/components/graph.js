
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
          renderer: am5xy.AxisRendererY.new(root, {
          })
        })
      );

      yAxis.get("renderer").grid.template.setAll({
        strokeWidth: 0,
        visible: false
      });
      
      // Create X-Axis
      var xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
          categoryField: "period",
          renderer: am5xy.AxisRendererX.new(root, {
            minGridDistance: 20
          }),
          tooltip: am5.Tooltip.new(root, {})
        })
      );
      xAxis.get("renderer").grid.template.setAll({
        strokeWidth: 0,
        visible: false
      });
      xAxis.data.setAll(data);
      
      // Create series
      
      var series = chart.series.push(
        am5xy.SmoothedXLineSeries.new(root, {
          name: "Sales",
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: "sales",
          categoryXField: "period",
          legendLabelText: "{name}: {categoryX}",
          legendRangeLabelText: "{name}",
          tooltip: am5.Tooltip.new(root, {
            pointerOrientation: "horizontal",
            labelText: "{name} in {categoryX}: {valueY} {info}"
          }),
          stroke: "#008080",
          fill: "#008080"
        })
      );
      
      series.strokes.template.setAll({
        strokeWidth: 4,
      });

      series.bullets.push(function () {
        return am5.Bullet.new(root, {
          locationY: 0,
          sprite: am5.Circle.new(root, {
            radius: 6,
            stroke: root.interfaceColors.get("background"),
            strokeWidth: 2,
            fill: series.get("fill")
          })
        });
      });
        
      series.data.setAll(data);

      var series2 = chart.series.push(
        am5xy.SmoothedXLineSeries.new(root, {
          name: "Purchase",
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: "purchase",
          categoryXField: "period",
          legendLabelText: "{name}: {categoryX}",
          legendRangeLabelText: "{name}",
          tooltip: am5.Tooltip.new(root, {
            pointerOrientation: "horizontal",
            labelText: "{name} in {categoryX}: {valueY} {info}",
          }),
          stroke: "#F4D06F",
          fill: "#F4D06F"
        })
      );

      series2.strokes.template.setAll({
        strokeWidth: 4,
      });

      series2.get("tooltip").label.setAll({
        fill: am5.color("#000")
      })

      series2.bullets.push(function () {
        return am5.Bullet.new(root, {
          locationY: 0,
          sprite: am5.Circle.new(root, {
            radius: 6,
            stroke: root.interfaceColors.get("background"),
            strokeWidth: 2,
            fill: series2.get("fill")
          })
        });
      });

      series2.data.setAll(data);
      // Add cursor
      chart.set("cursor", am5xy.XYCursor.new(root, {
        behavior: "zoomX",
        
      }));
      chart.zoomOutButton.set("forceHidden", true);
      
      var legend = chart.children.push(am5.Legend.new(root, {
        centerX: am5.p50,
        x: am5.p50
      }));
      legend.data.setAll(chart.series.values);
    }

    async renderComboCharts(data) {
        const root = await this.initChart("#distribution-analysis");

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
          
          // Create axes
          // https://www.amcharts.com/docs/v5/charts/xy-chart/axes/
          var xRenderer = am5xy.AxisRendererX.new(root, {
            minorGridEnabled: true,
            minGridDistance: 60
          });
          var xAxis = chart.xAxes.push(
            am5xy.CategoryAxis.new(root, {
              categoryField: "period",
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

          yAxis2.get("renderer").grid.template.setAll({
            strokeWidth: 0,
            visible: false
          })
          
          function makeBarSeries(name, fieldName, color){
            var series = chart.series.push(
              am5xy.ColumnSeries.new(root, {
                name: name,
                xAxis: xAxis,
                yAxis: yAxis,
                valueYField: fieldName,
                categoryXField: "period",
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
          
          makeBarSeries("Stock", "stock_valuation", "#004040");
          makeBarSeries("CRM", "crm", "#01B8B8");
          
          var series2 = chart.series.push(
            am5xy.LineSeries.new(root, {
              name: "BFR",
              xAxis: xAxis,
              yAxis: yAxis2,
              valueYField: "bfr",
              categoryXField: "period",
              tooltip: am5.Tooltip.new(root, {
                pointerOrientation: "horizontal",
                labelText: "{name} in {categoryX}: {valueY} {info}"
              }),
              stroke: "#F4D06F",
              fill: "#F4D06F"
            })
          );
          
          series2.strokes.template.setAll({
            strokeWidth: 6,
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

          chart.zoomOutButton.set("forceHidden", true);
          
          // Make stuff animate on load
          // https://www.amcharts.com/docs/v5/concepts/animations/
          chart.appear(1000, 100);
    }

    generateSeriesData(resultData, series) {
        // Initialize an empty array to hold the series data
        var seriesData = [];
        
        // Group data by product type
        var groupedData = resultData.reduce((acc, item) => {
            let product_category_name = item.product_category_name;
            if (!acc[product_category_name]) {
                acc[product_category_name] = {
                    parent_type: item.type,
                    type: product_category_name,
                    percent: 0,
                    color: null,
                    products: [],
                    currency_symbol: item.currency_symbol
                };
            }

            let productIndex = acc[product_category_name].products.findIndex(product => product.id === item.product_id);
            if (productIndex === -1) {
                acc[product_category_name].products.push({
                    parent_type: item.type,
                    id: item.product_id,
                    name: item.product_name,
                    totalAmount: item.amount,
                    currency_symbol: item.currency_symbol
                });
            } else {
                acc[product_category_name].products[productIndex].totalAmount += item.amount;
            }
            return acc;
        }, {});

        // Calculate total amount for percentage calculation
        var totalAmount = resultData.reduce((sum, item) => sum + item.amount, 0);

        // Calculate percentages and push to seriesData
        for (var key in groupedData) {
            var group = groupedData[key];
            var groupTotal = group.products.reduce((sum, product) => sum + product.totalAmount, 0);
            group.percent = (groupTotal / totalAmount) * 100;

            // Assign color using series
            group.color = series.get("colors").getIndex(seriesData.length);

            seriesData.push(group);
        }

        return seriesData;
    }

    async renderPieCharts(data, referenceId) {
        const root = await this.initChart(referenceId);
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
              alignLabels: true
            })
          );
          
          series.slices.template.set("templateField", "sliceSettings");
          series.labels.template.set("radius", 2);

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

          series.get("colors").set("colors", [
            am5.color("#004040"),
            am5.color("#01B8B8"),
            am5.color("#40C0C0")
          ])

          // Define data
          // var data = await data;
          var selected;
          var types = this.generateSeriesData(data, series);
          series.data.setAll(generateChartData());
          series.appear();
          chart.appear();
          //generate chart data
          function generateChartData() {
            var chartData = [];
            for (var i = 0; i < types.length; i++) {
              if (i == selected) {
                chartData.push({
                  type: types[i].type,
                  percent: types[i].percent,
                  color: types[i].color,
                  pulled: true,
                  sliceSettings: {
                    active: true
                  },
                  products: types[i].products,
                  currency_symbol: types[i].currency_symbol,
                  parent_type: types[i].parent_type
                });
              } else {
                chartData.push({
                  type: types[i].type,
                  percent: types[i].percent,
                  color: types[i].color,
                  id: i,
                  pulled: true
                });
              }
            }
            return chartData;
          }

          function openModal(dataContext) {
            // Calculate the total amount sum
            const products = dataContext.products;
            // Sort products by totalAmount in descending order
            products.sort((a, b) => b.totalAmount - a.totalAmount);
            
            const totalAmountSum = products.reduce((sum, product) => sum + product.totalAmount, 0);
        
            // Format number as monetary (1.002,400)
            const formattedTotalAmountSum = totalAmountSum.toLocaleString("id-ID", { minimumFractionDigits: 2 });
            console.log(dataContext);
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
            nodeAlign: "left",
            paddingRight: 100
          }));

          series.nodes.get("colors").set("colors", [
            am5.color("#004040"),
            am5.color("#008080"),
            am5.color("#01B8B8"),
            am5.color("#40C0C0"),
            am5.color("#80FFFF")
          ])
          
          series.nodes.get("colors").set("step", 1);

          series.links.template.setAll({
            fillStyle: "gradient",
            controlPointDistance: 0.1
          });

          series.nodes.labels.template.setAll({
            fontSize: 14,
            maxWidth: 150,
            oversizedBehavior: "wrap-no-break"
          });
          
          // Set data
          // https://www.amcharts.com/docs/v5/charts/flow-charts/#Setting_data
          series.data.setAll([
            { from: "Purchase", to: "Stock Valuation", value: 5000 },
            { from: "Purchase", to: "On Delivery", value: 2500 },
            { from: "Stock Valuation", to: "Operating Income", value: 4000 },
            { from: "Stock Valuation", to: "Inventory", value: 1000 },
            { from: "Operating Income", to: "Net Income", value: 3000 },
            { from: "Operating Income", to: "COGS", value: 1000 },
          ]);

          // Make stuff animate on load
          series.appear(1000, 100);
    }

    async renderSingleLineChart(data, referenceId) {
        const root = await this.initChart(referenceId);

        var chart = root.container.children.push( 
          am5xy.XYChart.new(root, {
            panY: false,
            wheelY: "none",
            layout: root.verticalLayout,
            maxTooltipDistance: 0
          }) 
        );
  
        // Create Y-axis
        var yAxis = chart.yAxes.push(
          am5xy.ValueAxis.new(root, {
            extraTooltipPrecision: 1,
            renderer: am5xy.AxisRendererY.new(root, {
            })
          })
        );
  
        yAxis.get("renderer").grid.template.setAll({
          strokeWidth: 0,
          visible: false
        });

        yAxis.get("renderer").labels.template.set("visible", false);
        
        // Create X-Axis
        var xAxis = chart.xAxes.push(
          am5xy.CategoryAxis.new(root, {
            categoryField: "period",
            renderer: am5xy.AxisRendererX.new(root, {
              minGridDistance: 20
            }),
            tooltip: am5.Tooltip.new(root, {})
          })
        );
        xAxis.get("renderer").grid.template.setAll({
          strokeWidth: 0,
          visible: false
        });
        xAxis.get("renderer").labels.template.set("visible", false);
        xAxis.data.setAll(data);
        
        // Create series
        
        var series = chart.series.push(
          am5xy.SmoothedXLineSeries.new(root, {
            name: "ROI",
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: "roi",
            categoryXField: "period",
            stroke: "#008080",
            fill: "#008080"
          })
        );
        
        series.strokes.template.setAll({
          strokeWidth: 2,
        });
          
        series.data.setAll(data);

        series.bullets.push(function (_root, _series, dataItem) {
          if(dataItem.get("categoryX") === data[0].period || dataItem.get("categoryX") === data[data.length - 1].period){
            return am5.Bullet.new(root, {
              locationY: 0,
              sprite: am5.Circle.new(root, {
                radius: 6,
                stroke: root.interfaceColors.get("background"),
                strokeWidth: 2,
                fill: series.get("fill")
              })
            });
          }
        });

        series.bullets.push(function (_root, _series, dataItem) {
          if(dataItem.get("categoryX") === data[0].period || dataItem.get("categoryX") === data[data.length - 1].period){
            if(dataItem.dataContext.roi > 50){
              return am5.Bullet.new(root, {
                sprite: am5.Label.new(root, {
                  text: `${dataItem.get("valueY")}%`,
                  fill: series.get("fill"),
                  fontSize: 10,
                  centerX: am5.p0,
                  centerY: am5.p100,
                  dx: -10,
                  dy: 0,
                })
              });
            }
            else {
              return am5.Bullet.new(root, {
                sprite: am5.Label.new(root, {
                  text: `${dataItem.get("valueY")}%`,
                  fill: series.get("fill"),
                  fontSize: 10,
                  centerX: am5.p0,
                  centerY: am5.p100,
                  dx: -15,
                  dy: -0,
                })
              });
            }
          }
        });

        series.appear();
        chart.appear();
    }

    async renderCombinationChart(referenceId){
      const root = await this.initChart(referenceId);

      var chart = root.container.children.push(
          am5xy.XYChart.new(root, {
            panX: true,
            panY: true,
            wheelX: "panX",
            wheelY: "zoomX",
            paddingLeft: 0,
            paddingBottom: 30,
            layout: root.verticalLayout
          })
        );
        
        chart.get("colors").set("step", 5);
        
        // Add cursor
        // https://www.amcharts.com/docs/v5/charts/xy-chart/cursor/
        var cursor = chart.set(
          "cursor",
          am5xy.XYCursor.new(root, {
            behavior: "none"
          })
        );
        cursor.lineY.set("visible", false);
        
        // Create axes
        // https://www.amcharts.com/docs/v5/charts/xy-chart/axes/
        var xAxis = chart.xAxes.push(
          am5xy.CategoryAxis.new(root, {
            categoryField: "period",
            renderer: am5xy.AxisRendererX.new(root, {
              minorGridEnabled: true,
              minGridDistance: 70
            }),
            tooltip: am5.Tooltip.new(root, {})
          })
        );
        
        var yAxis = chart.yAxes.push(
          am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {})
          })
        );

        function makeBarSeries(name, fieldName, color){
          var series = chart.series.push(
            am5xy.ColumnSeries.new(root, {
              name: name,
              xAxis: xAxis,
              yAxis: yAxis,
              valueYField: fieldName,
              categoryXField: "period",
              tooltip: am5.Tooltip.new(root, {
                pointerOrientation: "horizontal",
                labelText: "{name} in {categoryX}: {valueY} {info}",
                layer: 60
              }),
              fill: color,
              stroke: color,
              layer: 60,
            })
          );
          
          series.columns.template.setAll({
            tooltipY: am5.percent(10),
            templateField: "columnSettings"
          });
          
          series.data.setAll(data);
          series.appear();
        } 
        
        // Add series
        // https://www.amcharts.com/docs/v5/charts/xy-chart/series/
        var series1 = chart.series.push(
          am5xy.SmoothedXLineSeries.new(root, {
            name: "Untaxed Total",
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: "untaxed_total",
            openValueYField: "amount_received",
            categoryXField: "period",
            stroke: am5.color("#F4D06F"),
            fill: am5.color("#F4D06F"),
            tooltip: am5.Tooltip.new(root, {
              pointerOrientation: "horizontal",
              labelText: "{name} in {categoryX}: {valueY} {info}",
              layer: 60
            }),
          })
        );
        
        series1.fills.template.setAll({
          fillOpacity: 0.3,
          visible: true
        });
        
        var series2 = chart.series.push(
          am5xy.SmoothedXLineSeries.new(root, {
            name: "Amount Received",
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: "amount_received",
            categoryXField: "period",
            stroke: am5.color("#F4D06F"),
            fill: am5.color("#F4D06F"),
            tooltip: am5.Tooltip.new(root, {
              pointerOrientation: "horizontal",
              labelText: "{name} in {categoryX}: {valueY} {info}",
              layer: 60
            }),
          })
        );
        
        var data = [
          {
            period: "August 2023",
            untaxed_total: 1355483.35,
            amount_to_invoice: 5588.93,
            amount_received: 1351485.60,
            waiting_for_payment: 1209.71,
            overdue: 1427.80
          },
          {
            period: "September 2023",
            untaxed_total: 393202.64,
            amount_to_invoice: 0.00,
            amount_received: 395969.00,
            waiting_for_payment: 0.00,
            overdue: 0.00
          },
          {
            period: "October 2023",
            untaxed_total: 668641.60,
            amount_to_invoice: 0.00,
            amount_received: 675155.42,
            waiting_for_payment: 0.00,
            overdue: 0.00
          },
          {
            period: "November 2023",
            untaxed_total: 798845.65,
            amount_to_invoice: 0.00,
            amount_received: 804156.59,
            waiting_for_payment: 0.00,
            overdue: 0.00
          },
          {
            period: "December 2023",
            untaxed_total: 1118137.82,
            amount_to_invoice: 0.00,
            amount_received: 1120649.00,
            waiting_for_payment: 0.00,
            overdue: 0.00
          },
          {
            period: "January 2024",
            untaxed_total: 74952.24,
            amount_to_invoice: 0.00,
            amount_received: 754270.41,
            waiting_for_payment: 30790.00,
            overdue: 25347.36
          },
          {
            period: "February 2024",
            untaxed_total: 1201906.90,
            amount_to_invoice: 0.00,
            amount_received: 978993.40,
            waiting_for_payment: 232237.00,
            overdue: 266252.86
          },
          {
            period: "March 2024",
            untaxed_total: 894261.24,
            amount_to_invoice: 107194.27,
            amount_received: 614329.18,
            waiting_for_payment: 173833.50,
            overdue: 180864.37
          },
          {
            period: "April 2024",
            untaxed_total: 679582.94,
            amount_to_invoice: 8948.87,
            amount_received: 229562.59,
            waiting_for_payment: 451226.00,
            overdue: 488781.10
          },
          {
            period: "May 2024",
            untaxed_total: 1136836.11,
            amount_to_invoice: 749840.51,
            amount_received: 90440.90,
            waiting_for_payment: 298306.30,
            overdue: 241101.23
          },
          {
            period: "June 2024",
            untaxed_total: 715509.53,
            amount_to_invoice: 601052.31,
            amount_received: 29894.57,
            waiting_for_payment: 86604.50,
            overdue: 102883.02
          },
          {
            period: "July 2024",
            untaxed_total: 588953.90,
            amount_to_invoice: 540474.83,
            amount_received: 46511.39,
            waiting_for_payment: 1969.00,
            overdue: 2230.83
          }
        ];
        
        // Set data
        xAxis.data.setAll(data);
        series1.data.setAll(data);
        series2.data.setAll(data);

        makeBarSeries("Amount to Invoice", "amount_to_invoice", "#004040");
        makeBarSeries("Waiting for Payment", "waiting_for_payment", "#009696");
        makeBarSeries("Overdue", "overdue", "#02DEDE");
        
        // Create ranges
        var rangeDataItem;
        
        // Process each data point to create ranges
        for (var i = 0; i < data.length; i++) {
          var currentData = data[i];
          
          // Check if amount_received is greater than untaxed_total
          if (currentData.amount_received > currentData.untaxed_total) {
            // If we don't have an active range, create one
            if (!rangeDataItem) {
              rangeDataItem = xAxis.makeDataItem({});
              var range = series1.createAxisRange(rangeDataItem);
              rangeDataItem.set("category", currentData.period);
              
              range.fills.template.setAll({
                fill: am5.color("#F4D06F"),
                fillOpacity: 0.3,
                visible: true
              });
              
              range.strokes.template.setAll({
                stroke: am5.color("#F4D06F"),
                strokeWidth: 4
              });
            }
          } else {
            // If we have an active range and now untaxed_total is greater, end the range
            if (rangeDataItem) {
              rangeDataItem.set("endCategory", currentData.period);
              rangeDataItem = undefined;
            }
          }
          
          // If this is the last item and we have an open range, close it
          if (i === data.length - 1 && rangeDataItem) {
            rangeDataItem.set("endCategory", currentData.period);
            rangeDataItem = undefined;
          }
        }
        
        series1.strokes.template.setAll({
                strokeWidth: 4,
              });
        
        series2.strokes.template.setAll({
                strokeWidth: 4,
              });
        
        series1.bullets.push(
          function () {
                return am5.Bullet.new(root, {
                  locationY: 0,
                  sprite: am5.Circle.new(root, {
                    radius: 6,
                    stroke: root.interfaceColors.get("background"),
                    strokeWidth: 2,
                    fill: series1.get("fill")
                  }),
                });
              }
        )
        series2.bullets.push(
          function () {
                return am5.Bullet.new(root, {
                  locationY: 0,
                  sprite: am5.Circle.new(root, {
                    radius: 6,
                    stroke: root.interfaceColors.get("background"),
                    strokeWidth: 2,
                    fill: series2.get("fill")
                  }),
                });
              }
        )
        var legend = chart.children.push(
          am5.Legend.new(root, {
            centerX: am5.p50,
            x: am5.p50,
            y: am5.p100
          })
        );
        legend.data.setAll(chart.series.values);

        chart.zoomOutButton.set("forceHidden", true);
        series1.appear(1000);
        series2.appear(1000);
        chart.appear(1000, 100);
    }
    
    async renderHierarchyChart(referenceId){
      const root = await this.initChart(referenceId);
      var data = {
        value: 0,
        children: [
          {
            name: "Flora",
            children: [
              {
                name: "Black Tea",
                value: 1
              },
              {
                name: "Floral",
                children: [
                  {
                    name: "Chamomile",
                    value: 1
                  },
                  {
                    name: "Rose",
                    value: 1
                  },
                  {
                    name: "Jasmine",
                    value: 1
                  }
                ]
              }
            ]
          },
          {
            name: "Fruity",
            children: [
              {
                name: "Berry",
                children: [
                  {
                    name: "Blackberry",
                    value: 1
                  },
                  {
                    name: "Raspberry",
                    value: 1
                  },
                  {
                    name: "Blueberry",
                    value: 1
                  },
                  {
                    name: "Strawberry",
                    value: 1
                  }
                ]
              },
              {
                name: "Dried Fruit",
                children: [
                  {
                    name: "Raisin",
                    value: 1
                  },
                  {
                    name: "Prune",
                    value: 1
                  }
                ]
              },
              {
                name: "Other Fruit",
                children: [
                  {
                    name: "Coconut",
                    value: 1
                  },
                  {
                    name: "Cherry",
                    value: 1
                  },
                  {
                    name: "Pomegranate",
                    value: 1
                  },
                  {
                    name: "Pineapple",
                    value: 1
                  },
                  {
                    name: "Grape",
                    value: 1
                  },
                  {
                    name: "Apple",
                    value: 1
                  },
                  {
                    name: "Peach",
                    value: 1
                  },
                  {
                    name: "Pear",
                    value: 1
                  }
                ]
              },
              {
                name: "Citrus Fruit",
                children: [
                  {
                    name: "Grapefruit",
                    value: 1
                  },
                  {
                    name: "Orange",
                    value: 1
                  },
                  {
                    name: "Lemon",
                    value: 1
                  },
                  {
                    name: "Lime",
                    value: 1
                  }
                ]
              }
            ]
          },
          {
            name: "Sour/Fermented",
            children: [
              {
                name: "Sour",
                children: [
                  {
                    name: "Sour Aromatics",
                    value: 1
                  },
                  {
                    name: "Acetic Acid",
                    value: 1
                  },
                  {
                    name: "Butyric Acid",
                    value: 1
                  },
                  {
                    name: "Isovaleric Acid",
                    value: 1
                  },
                  {
                    name: "Citric Acid",
                    value: 1
                  },
                  {
                    name: "Malic Acid",
                    value: 1
                  }
                ]
              },
              {
                name: "Alcohol/Fremented",
                children: [
                  {
                    name: "Winey",
                    value: 1
                  },
                  {
                    name: "Whiskey",
                    value: 1
                  },
                  {
                    name: "Fremented",
                    value: 1
                  },
                  {
                    name: "Overripe",
                    value: 1
                  }
                ]
              }
            ]
          },
          {
            name: "Green/Vegetative",
            children: [
              {
                name: "Olive Oil",
                value: 1
              },
              {
                name: "Raw",
                value: 1
              },
              {
                name: "Green/Vegetative",
                children: [
                  {
                    name: "Under-ripe",
                    value: 1
                  },
                  {
                    name: "Peapod",
                    value: 1
                  },
                  {
                    name: "Fresh",
                    value: 1
                  },
                  {
                    name: "Dark Green",
                    value: 1
                  },
                  {
                    name: "Vegetative",
                    value: 1
                  },
                  {
                    name: "Hay-like",
                    value: 1
                  },
                  {
                    name: "Herb-like",
                    value: 1
                  }
                ]
              },
              {
                name: "Beany",
                value: 1
              }
            ]
          },
          {
            name: "Other",
            children: [
              {
                name: "Papery/Musty",
                children: [
                  {
                    name: "Stale",
                    value: 1
                  },
                  {
                    name: "Cardboard",
                    value: 1
                  },
                  {
                    name: "Papery",
                    value: 1
                  },
                  {
                    name: "Woody",
                    value: 1
                  },
                  {
                    name: "Moldy/Damp",
                    value: 1
                  },
                  {
                    name: "Musty/Dusty",
                    value: 1
                  },
                  {
                    name: "Musty/Earthy",
                    value: 1
                  },
                  {
                    name: "Animalic",
                    value: 1
                  },
                  {
                    name: "Meaty Brothy",
                    value: 1
                  },
                  {
                    name: "Phenolic",
                    value: 1
                  }
                ]
              },
              {
                name: "Chemical",
                children: [
                  {
                    name: "Bitter",
                    value: 1
                  },
                  {
                    name: "Salty",
                    value: 1
                  },
                  {
                    name: "Medicinal",
                    value: 1
                  },
                  {
                    name: "Petroleum",
                    value: 1
                  },
                  {
                    name: "Skunky",
                    value: 1
                  },
                  {
                    name: "Rubber",
                    value: 1
                  }
                ]
              }
            ]
          },
          {
            name: "Roasted",
            children: [
              {
                name: "Pipe Tobacco",
                value: 1
              },
              {
                name: "Tobacco",
                value: 1
              },
              {
                name: "Burnt",
                children: [
                  {
                    name: "Acrid",
                    value: 1
                  },
                  {
                    name: "Ashy",
                    value: 1
                  },
                  {
                    name: "Smoky",
                    value: 1
                  },
                  {
                    name: "Brown, Roast",
                    value: 1
                  }
                ]
              },
              {
                name: "Cereal",
                children: [
                  {
                    name: "Grain",
                    value: 1
                  },
                  {
                    name: "Malt",
                    value: 1
                  }
                ]
              }
            ]
          },
          {
            name: "Spices",
            children: [
              {
                name: "Pungent",
                value: 1
              },
              {
                name: "Pepper",
                value: 1
              },
              {
                name: "Brown Spice",
                children: [
                  {
                    name: "Anise",
                    value: 1
                  },
                  {
                    name: "Nutmeg",
                    value: 1
                  },
                  {
                    name: "Cinnamon",
                    value: 1
                  },
                  {
                    name: "Clove",
                    value: 1
                  }
                ]
              }
            ]
          },
          {
            name: "Nutty/Cocoa",
            children: [
              {
                name: "Nutty",
                children: [
                  {
                    name: "Peanuts",
                    value: 1
                  },
                  {
                    name: "Hazelnut",
                    value: 1
                  },
                  {
                    name: "Almond",
                    value: 1
                  }
                ]
              },
              {
                name: "Cocoa",
                children: [
                  {
                    name: "Chocolate",
                    value: 1
                  },
                  {
                    name: "Dark Chocolate",
                    value: 1
                  }
                ]
              }
            ]
          },
          {
            name: "Sweet",
            children: [
              {
                name: "Brown Sugar",
                children: [
                  {
                    name: "Molasses",
                    value: 1
                  },
                  {
                    name: "Maple Syrup",
                    value: 1
                  },
                  {
                    name: "Caramelized",
                    value: 1
                  },
                  {
                    name: "Honey",
                    value: 1
                  }
                ]
              },
              {
                name: "Vanilla",
                value: 1
              },
              {
                name: "Vanillin",
                value: 1
              },
              {
                name: "Overall Sweet",
                value: 1
              },
              {
                name: "Sweet Aromatics",
                value: 1
              }
            ]
          }
        ]
      };
      
      var zoomableContainer = root.container.children.push(
        am5.ZoomableContainer.new(root, {
          width: am5.p100,
          height: am5.p100,
          wheelable: true,
          pinchZoom: true
        })
      );
      
      var zoomTools = zoomableContainer.children.push(am5.ZoomTools.new(root, {
        target: zoomableContainer
      }));
      
      zoomTools.homeButton.get("background").set("fill", "#004040")
      zoomTools.homeButton.get("background").states.create("hover", {}).setAll({
        fill: am5.color("#008080")
      })
      zoomTools.homeButton.get("background").states.create("down", {}).setAll({
        fill: am5.color("#01B8B8")
      })

      zoomTools.plusButton.get("background").set("fill", "#004040")
      zoomTools.plusButton.get("background").states.create("hover", {}).setAll({
        fill: am5.color("#008080")
      })
      zoomTools.plusButton.get("background").states.create("down", {}).setAll({
        fill: am5.color("#01B8B8")
      })

      zoomTools.minusButton.get("background").set("fill", "#004040")
      zoomTools.minusButton.get("background").states.create("hover", {}).setAll({
        fill: am5.color("#008080")
      })
      zoomTools.minusButton.get("background").states.create("down", {}).setAll({
        fill: am5.color("#01B8B8")
      })

      
      // Create series
      // https://www.amcharts.com/docs/v5/charts/hierarchy/#Adding
      var series = zoomableContainer.contents.children.push(am5hierarchy.ForceDirected.new(root, {
        maskContent:false, //!important with zoomable containers
        singleBranchOnly: true,
        downDepth: 1,
        topDepth: 1,
        initialDepth: 0,
        valueField: "value",
        categoryField: "name",
        childDataField: "children",
        idField: "name",
        linkWithField: "linkWith",
        manyBodyStrength: -20,
        centerStrength: 0.6
      }));
      
      series.get("colors").set("colors", [
        am5.color("#B5918C"),
        am5.color("#205353"),
        am5.color("#008080"),
        am5.color("#549D95"),
        am5.color("#F7B501"),
        am5.color("#E89B00"),
        am5.color("#CC6300"),
        am5.color("#B04700"),
        am5.color("#942A00"),
        am5.color("#6C1E20")
      ])
      
      series.get("colors").setAll({
        step: 1
      });
      
      series.links.template.set("strength", 2);
      series.labels.template.set("minScale", 0);
      
      series.data.setAll([data]);
      
      series.set("selectedDataItem", series.dataItems[0]);
      
      
      
      // Make stuff animate on load
      series.appear(1000, 100);
    }

    async renderBarChart(referenceId){
      const root = await this.initChart(referenceId);
      var chart = root.container.children.push(am5xy.XYChart.new(root, {
        panX: true,
        panY: true,
        wheelX: "panX",
        wheelY: "zoomX",
        pinchZoomX: true,
        paddingLeft:0,
        paddingRight:1
      }));
      
      // Add cursor
      // https://www.amcharts.com/docs/v5/charts/xy-chart/cursor/
      var cursor = chart.set("cursor", am5xy.XYCursor.new(root, {}));
      cursor.lineY.set("visible", false);
      
      
      // Create axes
      // https://www.amcharts.com/docs/v5/charts/xy-chart/axes/
      var xRenderer = am5xy.AxisRendererX.new(root, { 
        minGridDistance: 30, 
        minorGridEnabled: true
      });
      
      xRenderer.labels.template.setAll({
        centerY: am5.p50,
        centerX: am5.p50,
        paddingRight: 0
      });
      
      xRenderer.grid.template.setAll({
        location: 1
      })
      
      var xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
        maxDeviation: 0.3,
        categoryField: "country",
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, {})
      }));
      
      var yRenderer = am5xy.AxisRendererY.new(root, {
        strokeOpacity: 0.1
      })
      
      var yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
        maxDeviation: 0.3,
        renderer: yRenderer
      }));
      
      // Create series
      // https://www.amcharts.com/docs/v5/charts/xy-chart/series/
      var series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name: "Series 1",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "value",
        sequencedInterpolation: true,
        categoryXField: "country",
        tooltip: am5.Tooltip.new(root, {
          labelText: "{valueY}"
        }),
        fill: "#008080",
        stroke: "#008080"
      }));
      
      // Set data
      var data = [{
        country: "USA",
        value: 2025
      }, {
        country: "China",
        value: 1882
      }, {
        country: "Japan",
        value: 1809
      }, {
        country: "Germany",
        value: 1322
      }, {
        country: "UK",
        value: 1122
      }, {
        country: "France",
        value: 1114
      }, {
        country: "India",
        value: 984
      }, {
        country: "Spain",
        value: 711
      }, {
        country: "Netherlands",
        value: 665
      }, {
        country: "South Korea",
        value: 443
      }, {
        country: "Canada",
        value: 441
      }];
      
      xAxis.data.setAll(data);
      series.data.setAll(data);
      
      chart.zoomOutButton.set("forceHidden", true);
      // Make stuff animate on load
      // https://www.amcharts.com/docs/v5/concepts/animations/
      series.appear(1000);
      chart.appear(1000, 100);
      
    }

    async renderTopSellingProducts(data, type) {
      if (type === 'value') {
          if (data && data.top3ProductsByValue) {
              data = data.top3ProductsByValue;
          } else {
              data = [];
          }
      } else {
          if (data && data.top3ProductsByQuantity) {
              data = data.top3ProductsByQuantity;
          } else {
              data = [];
          }
      }
      console.log("data", data);
      const root = await this.initChart("#top-3-sales-by-product");
      console.log("root", root);
      var chart = root.container.children.push(
          am5xy.XYChart.new(root, {
              panY: false,
              wheelY: "zoomX",
              layout: root.verticalLayout,
              maxTooltipDistance: 0
          })
      );

      // Create X-Axis for products
      var xAxis = chart.xAxes.push(
          am5xy.CategoryAxis.new(root, {
              categoryField: "product",
              renderer: am5xy.AxisRendererX.new(root, {})
          })
      );
      xAxis.data.setAll(data);

      // Create left Y-Axis for total value
      var yAxisLeft = chart.yAxes.push(
          am5xy.ValueAxis.new(root, {
              renderer: am5xy.AxisRendererY.new(root, {})
          })
      );

      // Create right Y-Axis for total quantity
      var yAxisRight = chart.yAxes.push(
          am5xy.ValueAxis.new(root, {
              renderer: am5xy.AxisRendererY.new(root, { opposite: true })
          })
      );

      // Create series for total value
      var valueSeries = chart.series.push(
          am5xy.ColumnSeries.new(root, {
              name: "Total Value",
              xAxis: xAxis,
              yAxis: yAxisLeft,
              valueYField: "totalValue",
              categoryXField: "product",
              fill: am5.color(0x004040),
              stroke: am5.color(0x004040),
              clustered: true, // Ensure bars are on different sides
              tooltip: am5.Tooltip.new(root, {
                  labelText: "{name}: {valueY}"
              }),
              width: 0.5
          })
      );
      valueSeries.data.setAll(data);

      // Create series for total quantity
      var quantitySeries = chart.series.push(
          am5xy.ColumnSeries.new(root, {
              name: "Total Quantity",
              xAxis: xAxis,
              yAxis: yAxisRight,
              valueYField: "totalQuantity",
              categoryXField: "product",
              fill: am5.color(0x01B8B8),
              stroke: am5.color(0x01B8B8),
              clustered: true, // Ensure bars are on different sides
              tooltip: am5.Tooltip.new(root, {
                  labelText: "{name}: {valueY}"
              }),
              width: 0.5
          })
      );
      quantitySeries.data.setAll(data);
      
      chart.set("cursor", am5xy.XYCursor.new(root, {}));
      // Add legend and set it on top
      var legend = chart.children.unshift(am5.Legend.new(root, {
          centerX: am5.p50,
          x: am5.p50,
          centerY: am5.p0,
          y: am5.p0
      }));
      legend.data.setAll(chart.series.values);

      chart.appear(1000, 100);
    }

    async renderAverageSaleOrderLine(data) {
      const chartData = data;
      const root = await this.initChart("#average-sales-line-chart");

      var chart = root.container.children.push(
          am5xy.XYChart.new(root, {
              layout: root.verticalLayout
          })
      );

      // Create X-Axis for dates
      var xAxis = chart.xAxes.push(
          am5xy.DateAxis.new(root, {
              baseInterval: {
                  timeUnit: "day",
                  count: 1
              },
              renderer: am5xy.AxisRendererX.new(root, {})
          })
      );

      xAxis.get("renderer").grid.template.setAll({
          strokeWidth: 0,
          visible: false
        });

      // Create Y-Axis for average sale order amount
      var yAxis = chart.yAxes.push(
          am5xy.ValueAxis.new(root, {
              renderer: am5xy.AxisRendererY.new(root, {})
          })
      );

      yAxis.get("renderer").grid.template.setAll({
          strokeWidth: 0,
          visible: false
        });
      xAxis.get("renderer").labels.template.set("visible", false);
      yAxis.get("renderer").labels.template.set("visible", false);
      
      // Create series
      var series = chart.series.push(
          am5xy.LineSeries.new(root, {
              name: "Average Sale Order",
              xAxis: xAxis,
              yAxis: yAxis,
              valueYField: "averageSaleOrder",
              valueXField: "date",
              tooltip: am5.Tooltip.new(root, {
                  labelText: "{valueY}"
              }),
              fill: am5.color(0x008080),
              stroke: am5.color(0x008080),
          })
      );
      series.strokes.template.setAll({
          strokeWidth: 4,
      });
      series.data.setAll(chartData);

      // Add dots to the line series
      series.bullets.push(function() {
          return am5.Bullet.new(root, {
              sprite: am5.Circle.new(root, {
                  radius: 5,
                  fill: series.get("fill")
              })
          });
      });

      chart.appear(1000, 100);
  }
}