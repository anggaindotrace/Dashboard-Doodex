
/* global owl:readonly */
import { isMobileOS } from "@web/core/browser/feature_detection";
import { Component, useState, useRef, onMounted,onWillStart } from "@odoo/owl";

import { rpc } from "@web/core/network/rpc";
import { DashboardController } from "@Dashboard-Doodex/components/controller";
const {DateTime} = luxon;

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
    async renderLineCharts(data, filter) {
      const root = await this.initChart("#sales_purchase_evolution");
      var timeUnit;
      if(filter.includes('month')){
        timeUnit = { timeUnit: "day", count: 1 };
      }
      else if(filter.includes('quarter')){
        timeUnit = { timeUnit: "week", count: 1 };
      }
      else if(filter.includes('year')){
        timeUnit = { timeUnit: "month", count: 1 };
      } else {
        timeUnit = { timeUnit: "day", count: 1 };
      }

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
        am5xy.DateAxis.new(root, {
          baseInterval: timeUnit,
          renderer: am5xy.AxisRendererX.new(root, {
            minorGridEnabled: true,
            minGridDistance: 70
          }),
          tooltip: am5.Tooltip.new(root, {})
        })
      );

      xAxis.get("renderer").grid.template.setAll({
        strokeWidth: 0,
        visible: false
      });
      xAxis.data.setAll(data);

      var tooltipSeries = am5.Tooltip.new(root, {
        pointerOrientation: "horizontal",
        labelText: "{name} : {valueY} {info}",
        getFillFromSprite: false,
        autoTextColor: false,
      });

      tooltipSeries.get("background").setAll({
        fill: am5.color("#008080"),
        fillOpacity: 1
      });

      tooltipSeries.label.setAll({
        fill: am5.color("#fff")
      });
      
      // Create series
      
      var series = chart.series.push(
        am5xy.SmoothedXLineSeries.new(root, {
          name: "Sales",
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: "sales",
          valueXField: "date",
          stroke: "#008080",
          tooltip: tooltipSeries
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
            fill: series.get("stroke")
          })
        });
      });

      var tooltipSeries2 = am5.Tooltip.new(root, {
        pointerOrientation: "horizontal",
        labelText: "{name} : {valueY} {info}",
        getFillFromSprite: false,
        autoTextColor: false,
      });

      tooltipSeries2.get("background").setAll({
        fill: am5.color("#F4D06F"),
        fillOpacity: 1
      });

      tooltipSeries2.label.setAll({
        fill: am5.color("#fff")
      });
     
      var series2 = chart.series.push(
        am5xy.SmoothedXLineSeries.new(root, {
          name: "Purchase",
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: "purchase",
          valueXField: "date",
          tooltip: tooltipSeries2,
          stroke: "#F4D06F"
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
            fill: series2.get("stroke")
          })
        });
      });
            
      // Add cursor
      chart.set("cursor", am5xy.XYCursor.new(root, {
        behavior: "zoomX",
        
      }));
      chart.zoomOutButton.set("forceHidden", true);
      
      var legend = chart.children.push(am5.Legend.new(root, {
        centerX: am5.p50,
        x: am5.p50
      }));

      series.data.processor = am5.DataProcessor.new(root, {
        dateFormat: "yyyy-MM-dd",
        dateFields: ["date"]
      });

      series2.data.processor = am5.DataProcessor.new(root, {
        dateFormat: "yyyy-MM-dd",
        dateFields: ["date"]
      });

      var processedData = data;

      if(filter.includes('quarter') || filter.includes('year')){
        processedData = roundData(processData(data, filter));
      }

      series.data.setAll(processedData);
      series2.data.setAll(processedData);
      legend.data.setAll(chart.series.values);

      series.appear(1000);
      series2.appear(1000);
      chart.appear(1000, 100);
      function processData(data, filter){
        return data.reduce((acc, item) => {
          let date = new Date(item.date);
          let periodKey;
  
          if (filter.includes('quarter')) {
              // Set tanggal ke hari Senin awal minggu
              let weekStart = new Date(date);
              weekStart.setDate(date.getDate() - date.getDay() + 1); // Set ke Senin
              weekStart.setHours(0, 0, 0, 0);
              periodKey = weekStart.getTime(); // Gunakan timestamp awal minggu
          } else if (filter.includes('year')) {
              // Format "YYYY-MM" sebagai key
              periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          }
  
          if (!acc[periodKey]) {
              acc[periodKey] = {
                  date: periodKey,
                  sales: 0,
                  purchase: 0
              };
          }
  
          // Agregasi jumlah
          acc[periodKey].sales += item.sales;
          acc[periodKey].purchase += item.purchase;
          return acc;
      }, {});
      }
      function roundData(aggregatedData){
        return Object.values(aggregatedData).map(entry => ({
              date: entry.date,
              sales: parseFloat(entry.sales.toFixed(2)),
              purchase: parseFloat(entry.purchase.toFixed(2))
          }));
      }
    }

    async renderComboCharts(data, filter) {
        const root = await this.initChart("#distribution");

        var timeUnit;
        if(filter.includes('month')){
          timeUnit = { timeUnit: "day", count: 1 };
        }
        else if(filter.includes('quarter')){
          timeUnit = { timeUnit: "week", count: 1 };
        }
        else if(filter.includes('year')){
          timeUnit = { timeUnit: "month", count: 1 };
        } else {
          timeUnit = { timeUnit: "day", count: 1 };
        }

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

          var processedData = data;
          if(filter.includes('quarter') || filter.includes('year')){
            processedData = roundData(processData(data, filter));
          }
          
          // Create axes
          // https://www.amcharts.com/docs/v5/charts/xy-chart/axes/
          var xAxis = chart.xAxes.push(
            am5xy.DateAxis.new(root, {
              baseInterval: timeUnit,
              renderer: am5xy.AxisRendererX.new(root, {
                minorGridEnabled: true,
                minGridDistance: 70
              }),
              tooltip: am5.Tooltip.new(root, {})
            })
          );

          xAxis.get("renderer").grid.template.setAll({
            location: 1
          })
          
          xAxis.data.setAll(processedData);
          
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
                valueXField: "date",
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

            series.data.processor = am5.DataProcessor.new(root, {
              dateFormat: "yyyy-MM-dd",
              dateFields: ["date"]
            });
            
            series.data.setAll(processedData);
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
              valueXField: "date",
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
          
          series2.data.processor = am5.DataProcessor.new(root, {
            dateFormat: "yyyy-MM-dd",
            dateFields: ["date"]
          });

          series2.data.setAll(processedData);
          
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
          function processData(data, filter){
            return data.reduce((acc, item) => {
              let date = new Date(item.date);
              let periodKey;
      
              if (filter.includes('quarter')) {
                  // Set tanggal ke hari Senin awal minggu
                  let weekStart = new Date(date);
                  weekStart.setDate(date.getDate() - date.getDay() + 1); // Set ke Senin
                  weekStart.setHours(0, 0, 0, 0);
                  periodKey = weekStart.getTime(); // Gunakan timestamp awal minggu
              } else if (filter.includes('year')) {
                  // Format "YYYY-MM" sebagai key
                  periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              }
      
              if (!acc[periodKey]) {
                  acc[periodKey] = {
                      date: periodKey,
                      stock_valuation: 0,
                      crm: 0,
                      bfr: 0,
                      lastDate: new Date(0)
                  };
              }
      
              // Agregasi jumlah crm karena bersifat individual
              acc[periodKey].crm += item.crm;

              //mempertahankan tanggal terakhir untuk menghitung bfr dan stock valuation karena bersifat cumulative
              const itemDate = new Date(item.date);
              if (itemDate > acc[periodKey].lastDate) {
                  acc[periodKey].lastDate = itemDate;
                  acc[periodKey].stock_valuation = item.stock_valuation;
                  acc[periodKey].bfr = item.bfr;
              }
              return acc;
            }, {});
          }
          function roundData(aggregatedData){
            return Object.values(aggregatedData).map(entry => ({
                  date: entry.date,
                  stock_valuation: parseFloat(entry.stock_valuation.toFixed(2)),
                  crm: parseFloat(entry.crm.toFixed(2)),
                  bfr: parseFloat(entry.bfr.toFixed(2))
              }));
          }
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

    async renderCombinationChart(data, referenceId, filter){
      const root = await this.initChart(referenceId);
      var timeUnit;
      if(filter.includes('Month')){
        timeUnit = { timeUnit: "day", count: 1 };
      }
      else if(filter.includes('Quarter')){
        timeUnit = { timeUnit: "week", count: 1 };
      }
      else if(filter.includes('Year')){
        timeUnit = { timeUnit: "month", count: 1 };
      } else {
        timeUnit = { timeUnit: "day", count: 1 };
      }

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
          am5xy.DateAxis.new(root, {
            baseInterval: timeUnit,
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
              valueXField: "date",
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
          
          series.data.setAll(processedData);
          series.appear();
        } 
        
        // Add series
        // https://www.amcharts.com/docs/v5/charts/xy-chart/series/
        var series1 = chart.series.push(
          am5xy.LineSeries.new(root, {
            name: "Untaxed Total",
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: "amount_untaxed",
            openValueYField: "amount_received",
            valueXField: "date",
            stroke: am5.color("#ff6f61"),
            fill: am5.color("#ff6f61"),
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
          am5xy.LineSeries.new(root, {
            name: "Amount Received",
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: "amount_received",
            valueXField: "date",
            stroke: am5.color("#00005d"),
            fill: am5.color("#00005d"),
            tooltip: am5.Tooltip.new(root, {
              pointerOrientation: "horizontal",
              labelText: "{name} in {categoryX}: {valueY} {info}",
              layer: 60
            }),
          })
        );
        
        // Set data
        series1.data.processor = am5.DataProcessor.new(root, {
          dateFormat: "yyyy-MM-dd",
          dateFields: ["date"]
        });
        series2.data.processor = am5.DataProcessor.new(root, {
          dateFormat: "yyyy-MM-dd",
          dateFields: ["date"]
        });
        var processedData = data;

        if(!filter.includes('Month')){
          processedData = roundData(processData(data, filter));
        }
        console.log(processedData);
        series1.data.setAll(processedData);
        series2.data.setAll(processedData);

        makeBarSeries("Amount to Invoice", "amount_to_invoice", "#004040");
        makeBarSeries("Waiting for Payment", "waiting_for_payment", "#009696");
        makeBarSeries("Overdue", "overdue", "#02DEDE");
        
        // create ranges
        var i = 0;
        var baseInterval = xAxis.get("baseInterval");
        var baseDuration = xAxis.baseDuration();
        var rangeDataItem;

        am5.array.each(series1.dataItems, function (s1DataItem) {
          var s1PreviousDataItem;
          var s2PreviousDataItem;

          var s2DataItem = series2.dataItems[i];

          if (i > 0) {
            s1PreviousDataItem = series1.dataItems[i - 1];
            s2PreviousDataItem = series2.dataItems[i - 1];
          }

          var startTime = am5.time
            .round(
              new Date(s1DataItem.get("valueX")),
              baseInterval.timeUnit,
              baseInterval.count
            )
            .getTime();

          // intersections
          if (s1PreviousDataItem && s2PreviousDataItem) {
            var x0 =
              am5.time
                .round(
                  new Date(s1PreviousDataItem.get("valueX")),
                  baseInterval.timeUnit,
                  baseInterval.count
                )
                .getTime() +
              baseDuration / 2;
            var y01 = s1PreviousDataItem.get("valueY");
            var y02 = s2PreviousDataItem.get("valueY");

            var x1 = startTime + baseDuration / 2;
            var y11 = s1DataItem.get("valueY");
            var y12 = s2DataItem.get("valueY");

            var intersection = getLineIntersection(
              { x: x0, y: y01 },
              { x: x1, y: y11 },
              { x: x0, y: y02 },
              { x: x1, y: y12 }
            );

            startTime = Math.round(intersection.x);
          }

          // start range here
          if (s2DataItem.get("valueY") > s1DataItem.get("valueY")) {
            if (!rangeDataItem) {
              rangeDataItem = xAxis.makeDataItem({});
              var range = series1.createAxisRange(rangeDataItem);
              rangeDataItem.set("value", startTime);
              range.fills.template.setAll({
                fill: series2.get("fill"),
                fillOpacity: 0.6,
                visible: true
              });
              range.strokes.template.setAll({
                stroke: series1.get("stroke"),
                strokeWidth: 1
              });
            }
          } else {
            // if negative range started
            if (rangeDataItem) {
              rangeDataItem.set("endValue", startTime);
            }

            rangeDataItem = undefined;
          }
          // end if last
          if (i == series1.dataItems.length - 1) {
            if (rangeDataItem) {
              rangeDataItem.set(
                "endValue",
                s1DataItem.get("valueX") + baseDuration / 2
              );
              rangeDataItem = undefined;
            }
          }

          i++;
        });
        
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
        function getLineIntersection(pointA1, pointA2, pointB1, pointB2) {
          let x =
            ((pointA1.x * pointA2.y - pointA2.x * pointA1.y) * (pointB1.x - pointB2.x) -
              (pointA1.x - pointA2.x) *
                (pointB1.x * pointB2.y - pointB1.y * pointB2.x)) /
            ((pointA1.x - pointA2.x) * (pointB1.y - pointB2.y) -
              (pointA1.y - pointA2.y) * (pointB1.x - pointB2.x));
          let y =
            ((pointA1.x * pointA2.y - pointA2.x * pointA1.y) * (pointB1.y - pointB2.y) -
              (pointA1.y - pointA2.y) *
                (pointB1.x * pointB2.y - pointB1.y * pointB2.x)) /
            ((pointA1.x - pointA2.x) * (pointB1.y - pointB2.y) -
              (pointA1.y - pointA2.y) * (pointB1.x - pointB2.x));
          return { x: x, y: y };
        }
        function processData(data, filter){
          return data.reduce((acc, item) => {
            let date = new Date(item.date);
            let periodKey;
    
            if (filter.includes('Quarter')) {
                // Set tanggal ke hari Senin awal minggu
                let weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay() + 1); // Set ke Senin
                weekStart.setHours(0, 0, 0, 0);
                periodKey = weekStart.getTime(); // Gunakan timestamp awal minggu
            } else if (filter.includes('Year')) {
                // Format "YYYY-MM" sebagai key
                periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }
    
            if (!acc[periodKey]) {
                acc[periodKey] = {
                    date: periodKey,
                    amount_untaxed: 0,
                    amount_to_invoice: 0,
                    waiting_for_payment: 0,
                    amount_received: 0,
                    invoice_amount_residual: 0,
                    overdue: 0
                };
            }
    
            // Agregasi jumlah
            acc[periodKey].amount_untaxed += item.amount_untaxed;
            acc[periodKey].amount_to_invoice += item.amount_to_invoice;
            acc[periodKey].waiting_for_payment += item.waiting_for_payment;
            acc[periodKey].amount_received += item.amount_received;
            acc[periodKey].invoice_amount_residual += item.invoice_amount_residual;
            acc[periodKey].overdue += item.overdue;
    
            return acc;
        }, {});
        }
        function roundData(aggregatedData){
          return Object.values(aggregatedData).map(entry => ({
                date: entry.date,
                amount_untaxed: parseFloat(entry.amount_untaxed.toFixed(2)),
                amount_to_invoice: parseFloat(entry.amount_to_invoice.toFixed(2)),
                waiting_for_payment: parseFloat(entry.waiting_for_payment.toFixed(2)),
                amount_received: parseFloat(entry.amount_received.toFixed(2)),
                invoice_amount_residual: parseFloat(entry.invoice_amount_residual.toFixed(2)),
                overdue: parseFloat(entry.overdue.toFixed(2))
            }));
        }
    }
    
    async renderHierarchyChart(data, referenceId){
      const root = await this.initChart(referenceId);
      var data = {
        value: 0,
        children: data
      }
      
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
        valueField: "quantity",
        categoryField: "name",
        childDataField: "children",
        idField: "name",
        linkWithField: "linkWith",
        manyBodyStrength: -20,
        centerStrength: 0.6,
        minRadius: 50,
        maxRadius: am5.percent(10)
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

    async renderBarChart(data, referenceId){
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
        categoryField: "salesperson",
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
        categoryXField: "salesperson",
        tooltip: am5.Tooltip.new(root, {
          labelText: "{valueY}"
        }),
        fill: "#008080",
        stroke: "#008080"
      }));
      
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