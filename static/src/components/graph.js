/* global owl:readonly */

export class Graph{
    constructor(root){
        this.root = root;
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

    async renderLineCharts() {
        const root = await this.initChart("#sales_purchase_evolution");
        var chart = root.container.children.push(am5xy.XYChart.new(root, {
            panX: true,
            panY: true,
            wheelX: "panX",
            wheelY: "zoomX",
            pinchZoomX:true,
            paddingLeft: 0
          }));
          
          
          // Add cursor
          // https://www.amcharts.com/docs/v5/charts/xy-chart/cursor/
          var cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
            behavior: "none"
          }));
          cursor.lineY.set("visible", false);
          
          
          // Generate random data
          var date = new Date();
          date.setHours(0, 0, 0, 0);
          var value = 100;
          
          function generateData() {
            value = Math.round((Math.random() * 10 - 5) + value);
            am5.time.add(date, "day", 1);
            return {
              date: date.getTime(),
              value: value
            };
          }
          
          function generateDatas(count) {
            var data = [];
            for (var i = 0; i < count; ++i) {
              data.push(generateData());
            }
            return data;
          }
          
          
          // Create axes
          // https://www.amcharts.com/docs/v5/charts/xy-chart/axes/
          var xAxis = chart.xAxes.push(am5xy.DateAxis.new(root, {
            maxDeviation: 0.2,
            baseInterval: {
              timeUnit: "day",
              count: 1
            },
            renderer: am5xy.AxisRendererX.new(root, {
              minorGridEnabled:true
            }),
            tooltip: am5.Tooltip.new(root, {})
          }));
          
          var yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {
              pan:"zoom"
            })  
          }));
          
          
          // Add series
          // https://www.amcharts.com/docs/v5/charts/xy-chart/series/
          var series = chart.series.push(am5xy.LineSeries.new(root, {
            name: "Series",
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: "value",
            valueXField: "date",
            tooltip: am5.Tooltip.new(root, {
              labelText: "{valueY}"
            })
          }));
          
          // Set data
          var data = generateDatas(1200);
          series.data.setAll(data);
          
          
          // Make stuff animate on load
          // https://www.amcharts.com/docs/v5/concepts/animations/
          series.appear(1000);
          chart.appear(1000, 100);
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
              income: 23.5,
              expenses: 21.1
            },
            {
              year: "2017",
              income: 26.2,
              expenses: 30.5
            },
            {
              year: "2018",
              income: 30.1,
              expenses: 34.9
            },
            {
              year: "2019",
              income: 29.5,
              expenses: 31.1
            },
            {
              year: "2020",
              income: 30.6,
              expenses: 28.2,
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
          
          var yAxis = chart.yAxes.push(
            am5xy.ValueAxis.new(root, {
              min: 0,
              extraMax: 0.1,
              renderer: am5xy.AxisRendererY.new(root, {
                strokeOpacity: 0.1
              })
            })
          );
          
          
          // Add series
          // https://www.amcharts.com/docs/v5/charts/xy-chart/series/
          
          var series1 = chart.series.push(
            am5xy.ColumnSeries.new(root, {
              name: "Income",
              xAxis: xAxis,
              yAxis: yAxis,
              valueYField: "income",
              categoryXField: "year",
              tooltip: am5.Tooltip.new(root, {
                pointerOrientation: "horizontal",
                labelText: "{name} in {categoryX}: {valueY} {info}"
              })
            })
          );
          
          series1.columns.template.setAll({
            tooltipY: am5.percent(10),
            templateField: "columnSettings"
          });
          
          series1.data.setAll(data);
          
          var series2 = chart.series.push(
            am5xy.LineSeries.new(root, {
              name: "Expenses",
              xAxis: xAxis,
              yAxis: yAxis,
              valueYField: "expenses",
              categoryXField: "year",
              tooltip: am5.Tooltip.new(root, {
                pointerOrientation: "horizontal",
                labelText: "{name} in {categoryX}: {valueY} {info}"
              })
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
          series1.appear();
    }

    async renderPieCharts() {
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
          series.labels.template.set("radius", 30);
          
          // Set up click events
          series.slices.template.events.on("click", function(event) {
            console.log(event.target.dataItem.dataContext)
            if (event.target.dataItem.dataContext.id != undefined) {
              selected = event.target.dataItem.dataContext.id;
            } else {
              selected = undefined;
            }
            series.data.setAll(generateChartData());
          });
          
          // Define data
          var selected;
          var types = [{
            type: "Fossil Energy",
            percent: 70,
            color: series.get("colors").getIndex(0),
            subs: [{
              type: "Oil",
              percent: 15
            }, {
              type: "Coal",
              percent: 35
            }, {
              type: "Nuclear",
              percent: 20
            }]
          }, {
            type: "Green Energy",
            percent: 30,
            color: series.get("colors").getIndex(1),
            subs: [{
              type: "Hydro",
              percent: 15
            }, {
              type: "Wind",
              percent: 10
            }, {
              type: "Other",
              percent: 5
            }]
          }];
          series.data.setAll(generateChartData());
          
          
          function generateChartData() {
            var chartData = [];
            for (var i = 0; i < types.length; i++) {
              if (i == selected) {
                for (var x = 0; x < types[i].subs.length; x++) {
                  chartData.push({
                    type: types[i].subs[x].type,
                    percent: types[i].subs[x].percent,
                    color: types[i].color,
                    pulled: true,
                    sliceSettings: {
                      active: true
                    }
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