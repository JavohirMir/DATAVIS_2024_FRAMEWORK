/*
 * Data Visualization - Framework
 * Copyright (C) University of Passau
 * Faculty of Computer Science and Mathematics
 * Chair of Cognitive sensor systems
 * Maintenance:
 * 2025, Alexander Gall <alexander.gall@uni-passau.de>
 *
 * All rights reserved.
 */

let lineChart, chart2, chart3, chart4;
let lineChartXAxis, lineChartYAxis, lineChartXAxisLabel, lineChartYAxisLabel;
let lineChartXScale, lineChartYScale;

// Dimensions for the line chart dropdown
const lineChartDimensions = ["Water_Level_m", "Surface_Area_km2", "Volume_km3"];
const xAxisDimension = "Year"; // <--- NEW: Define the X-axis dimension

function initDashboard(_data) {
  clearDashboard();

  lineChart = d3
    .select("#line-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  chart2 = d3
    .select("#chart2")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g");

  chart3 = d3
    .select("#chart3")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g");

  chart4 = d3
    .select("#chart4")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g");

  initLineChartMenu("lineChartY", lineChartDimensions);

  lineChartXScale = d3
    .scaleLinear()
    .range([0, width - margin.left - margin.right]);

  lineChartYScale = d3
    .scaleLinear()
    .range([height - margin.top - margin.bottom, 0]);

  lineChartXAxis = lineChart
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`);

  lineChartXAxisLabel = lineChartXAxis
    .append("text")
    .attr("fill", "black")
    .attr("x", width - margin.left - margin.right)
    .attr("y", -6)
    .style("text-anchor", "end")
    .text("Year");

  lineChartYAxis = lineChart.append("g").attr("class", "y axis");

  lineChartYAxisLabel = lineChartYAxis
    .append("text")
    .attr("fill", "black")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", "0.71em")
    .style("text-anchor", "end")
    .text("Value");

  renderLineChart();

  createChart2();
  createChart3();
  createChart4();
}

function initLineChartMenu(id, entries) {
  $("select#" + id).empty();

  entries.forEach(function (d) {
    $("select#" + id).append("<option>" + d + "</option>");
  });

  $("#" + id).selectmenu({
    select: function () {
      renderLineChart();
    },
  });

  $("#" + id).selectmenu("refresh");
}

function renderLineChart() {
  if (!window.currentData || window.currentData.length === 0) {
    lineChart.selectAll("*").remove();
    return;
  }

  const selectedDimension = $("#lineChartY").val();

  if (
    !window.currentData[0].hasOwnProperty(xAxisDimension) ||
    !selectedDimension ||
    !window.currentData[0].hasOwnProperty(selectedDimension)
  ) {
    console.warn(
      `Required dimensions for line chart not found in data. Ensure '${xAxisDimension}' and selected Y-axis dimension exist.`
    );
    lineChart.selectAll(".line-path").remove();
    lineChart.selectAll(".dot").remove();
    return;
  }

  // Update Y-axis label
  lineChartYAxisLabel.text(selectedDimension);

  const xExtent = d3.extent(window.currentData, (d) => +d[xAxisDimension]);
  const yExtent = d3.extent(window.currentData, (d) => +d[selectedDimension]);

  // Add padding to the XY-axis domains ---
  const xMin = xExtent[0];
  const xMax = xExtent[1];
  const yMin = yExtent[0];
  const yMax = yExtent[1];
  const xPaddingFactor = 0.05;
  const yPaddingFactor = 0.05;

  const xBuffer = (xMax - xMin) * xPaddingFactor;
  const yBuffer = (yMax - yMin) * yPaddingFactor;

  lineChartXScale.domain([xMin - xBuffer, xMax + xBuffer]);
  lineChartYScale.domain([yMin - yBuffer, yMax + yBuffer]);

  // Update axes
  lineChartXAxis
    .transition()
    .duration(500)
    .call(d3.axisBottom(lineChartXScale).tickFormat(d3.format("d")));
  lineChartYAxis.transition().duration(500).call(d3.axisLeft(lineChartYScale));

  // Define the line generator
  const line = d3
    .line()
    .x((d) => lineChartXScale(+d[xAxisDimension]))
    .y((d) => lineChartYScale(+d[selectedDimension]));

  // Draw the line
  const path = lineChart.selectAll(".line-path").data([window.currentData]);

  path
    .enter()
    .append("path")
    .attr("class", "line-path")
    .merge(path)
    .transition()
    .duration(500)
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2);

  path.exit().remove();

  // Add circles for data points (similar to scatterplot dots)
  const dots = lineChart.selectAll(".dot").data(window.currentData);

  dots
    .enter()
    .append("circle")
    .attr("class", "dot")
    .merge(dots)
    .transition()
    .duration(500)
    .attr("cx", (d) => lineChartXScale(+d[xAxisDimension]))
    .attr("cy", (d) => lineChartYScale(+d[selectedDimension]))
    .attr("r", 4)
    .attr("fill", "steelblue")
    .attr("stroke", "white")
    .attr("stroke-width", 1);

  dots.exit().remove();

  // Add tooltip functionality to the dots
  lineChart
    .selectAll(".dot")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("r", 6).attr("fill", highlightColor); // Highlight dot on hover

      const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.8)")
        .style("color", "white")
        .style("padding", "5px")
        .style("border-radius", "3px")
        .style("pointer-events", "none")
        .style("opacity", 0);

      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `<strong>Year</strong>: ${d[xAxisDimension]}<br/><strong>${selectedDimension}</strong>: ${d[selectedDimension]}`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function (event, d) {
      d3.select(this).attr("r", 4).attr("fill", "steelblue");
      d3.selectAll(".tooltip").remove();
    });
}

function createChart2() {
  // Placeholder for Chart 2
}

function createChart3() {
  // Placeholder for Chart 3
}

function createChart4() {
  // Placeholder for Chart 4
}

// clear files if changes (dataset) occur
function clearDashboard() {
  if (lineChart) lineChart.selectAll("*").remove();
  if (chart2) chart2.selectAll("*").remove();
  if (chart3) chart3.selectAll("*").remove();
  if (chart4) chart4.selectAll("*").remove();
}
