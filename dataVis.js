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

// scatterplot axes
let xAxis, yAxis, xAxisLabel, yAxisLabel;
// radar chart axes
let radarAxes, radarAxesAngle;

let dimensions = [
  "dimension 1",
  "dimension 2",
  "dimension 3",
  "dimension 4",
  "dimension 5",
  "dimension 6",
];
//*HINT: the first dimension is often a label; you can simply remove the first dimension with
// dimensions.splice(0, 1);

// the visual channels we can use for the scatterplot
let channels = ["scatterX", "scatterY", "size"];

// size of the plots
let margin, width, height, radius;
// svg containers
let scatter, radar, dataTable;

// Add additional variables
let currentData = null;
let selectedDataPoints = []; // Array to store selected data points for radar chart
const colorScale = d3.scaleOrdinal(d3.schemeCategory10); // Color scale for radar chart
const unselectedColor = "#888"; // Light gray for unselected points
const highlightColor = "#ff3333"; // Bright red for highlighting
let colorAssignments = {}; // Track color assignments by data point identifier

// Helper functions for data highlighting
function highlightDataPoint(dataPoint) {
  // Highlight in scatterplot
  scatter
    .selectAll(".dot")
    .attr("fill", (d) => {
      if (d === dataPoint) {
        return highlightColor;
      }
      const index = selectedDataPoints.findIndex((selected) => selected === d);
      return index !== -1 ? colorScale(index) : unselectedColor;
    })
    .attr("stroke-width", (d) =>
      d === dataPoint ? 3 : isSelected(d) ? 1 : 0.5
    );
}

function removeHighlight() {
  // Remove highlight from scatterplot
  scatter
    .selectAll(".dot")
    .attr("fill", (d) => {
      const index = selectedDataPoints.findIndex((selected) => selected === d);
      return index !== -1 ? colorScale(index) : unselectedColor;
    })
    .attr("stroke-width", (d) => (isSelected(d) ? 1 : 0.5));
}

// Helper function to check if a data point is selected
function isSelected(dataPoint) {
  return selectedDataPoints.some((selected) => selected === dataPoint);
}

// Function to add/remove data point from selection
function toggleDataPointSelection(dataPoint) {
  const index = selectedDataPoints.findIndex(
    (selected) => selected === dataPoint
  );

  if (index === -1) {
    // Add to selection (but limit to 10 points)
    if (selectedDataPoints.length < 10) {
      selectedDataPoints.push(dataPoint);
      const identifier = getDataPointIdentifier(dataPoint);
      if (!colorAssignments[identifier]) {
        const usedColors = Object.values(colorAssignments);
        const availableColor = d3.schemeCategory10.find(
          (color) => !usedColors.includes(color)
        );
        colorAssignments[identifier] =
          availableColor ||
          colorScale(Object.keys(colorAssignments).length % 10);
      }
    } else {
      alert("Maximum of 10 points can be selected");
      return;
    }
  } else {
    // Remove from selection
    const removedPoint = selectedDataPoints.splice(index, 1)[0];
    const identifier = getDataPointIdentifier(removedPoint);
    delete colorAssignments[identifier];
  }

  // Update visualizations
  updateScatterplotSelection();
  renderRadarChart();
}

// Helper function to create a unique identifier for a data point
function getDataPointIdentifier(dataPoint) {
  return dataPoint.Year || dataPoint.ID || JSON.stringify(dataPoint);
}

// Function to update scatterplot visual selection
function updateScatterplotSelection() {
  scatter
    .selectAll(".dot")
    .attr("fill", (d) => {
      const identifier = getDataPointIdentifier(d);
      return isSelected(d)
        ? colorAssignments[identifier] || unselectedColor
        : unselectedColor;
    })
    .attr("stroke-width", (d) => (isSelected(d) ? 1 : 0.5));
}

// Initialize dashboard function (placeholder for Part 2)
function initDashboard(data) {
  // This function is defined in dashboard.js
  // It will be called here to initialize the dashboard with the loaded data
  if (typeof window.dashboardInit === "function") {
    // Pass the main data and the path to the river data CSV
    window.dashboardInit(data, "datasets/water_delivery_1992_2023.csv");
  } else {
    console.warn(
      "dashboardInit function not found. Dashboard might not be initialized."
    );
  }
}

function init() {
  // define size of plots
  margin = { top: 20, right: 20, bottom: 20, left: 50 };
  width = 600;
  height = 500;
  radius = width / 2;

  // Start at default tab
  document.getElementById("defaultOpen").click();

  // data table
  dataTable = d3.select("#dataTable");

  // scatterplot SVG container and axes
  scatter = d3
    .select("#sp")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g");

  // radar chart SVG container and axes
  radar = d3
    .select("#radar")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  // read and parse input file
  let fileInput = document.getElementById("upload"),
    readFile = function () {
      // clear existing visualizations
      clear();
      if (typeof clearDashboard === "function") {
        clearDashboard();
      }

      let reader = new FileReader();
      reader.onloadend = function () {
        console.log("data loaded: ");
        console.log(reader.result);

        // Parse CSV data
        const csvData = d3.csvParse(reader.result, (d) => {
          // Attempt to convert all values to numbers, if they are valid numbers
          const newD = {};
          for (const key in d) {
            const numVal = +d[key];
            newD[key] = isNaN(numVal) || d[key] === "" ? d[key] : numVal;
          }
          return newD;
        });
        console.log("parsed data: ", csvData);

        // Parse dimensions from CSV headers
        if (csvData.length > 0) {
          dimensions = Object.keys(csvData[0]);
          console.log("dimensions: ", dimensions);
        }

        // Initialize visualizations with parsed data
        initVis(csvData);
        CreateDataTable(csvData);

        // Call the dashboard initialization with the loaded data
        initDashboard(csvData);
      };
      reader.readAsBinaryString(fileInput.files[0]);
    };
  fileInput.addEventListener("change", readFile);
}

function initVis(_data) {
  // Store the data globally for use in other functions
  window.currentData = _data;

  // Parse dimensions (attributes) from the data
  if (_data && _data.length > 0) {
    dimensions = Object.keys(_data[0]);
    console.log("Available dimensions:", dimensions);
  }

  // Get the extent (min, max) for each numeric dimension
  let extents = {};
  dimensions.forEach((dim) => {
    if (_data) {
      const values = _data.map((d) => +d[dim]).filter((v) => !isNaN(v));
      if (values.length > 0) {
        extents[dim] = d3.extent(values);
      }
    }
  });

  // y scalings for scatterplot
  let y = d3
    .scaleLinear()
    .range([height - margin.bottom - margin.top, margin.top]);

  // x scalings for scatter plot
  let x = d3
    .scaleLinear()
    .range([margin.left, width - margin.left - margin.right]);

  // radius scalings for radar chart
  let r = d3.scaleLinear().range([0, radius * 0.75]);

  // Store scales globally
  window.xScale = x;
  window.yScale = y;
  window.rScale = r;
  window.extents = extents;

  // scatterplot axes
  yAxis = scatter
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + margin.left + ")")
    .call(d3.axisLeft(y));

  yAxisLabel = yAxis
    .append("text")
    .style("text-anchor", "middle")
    .attr("y", margin.top / 2)
    .text("x");

  xAxis = scatter
    .append("g")
    .attr("class", "axis")
    .attr(
      "transform",
      "translate(0, " + (height - margin.bottom - margin.top) + ")"
    )
    .call(d3.axisBottom(x));

  xAxisLabel = xAxis
    .append("text")
    .style("text-anchor", "middle")
    .attr("x", width - margin.right)
    .text("y");

  // Filter numeric dimensions for radar chart axes and labels
  const numericDimensionsForRadar = dimensions.filter((dim) => {
    const values = _data.map((d) => +d[dim]).filter((v) => !isNaN(v));
    return values.length > 0;
  });

  // radar chart axes
  radarAxesAngle = (Math.PI * 2) / numericDimensionsForRadar.length;
  let axisRadius = d3.scaleLinear().range([0, radius]);
  let maxAxisRadius = 0.75,
    textRadius = 0.8;

  // Clear existing radar elements
  radar.selectAll("*").remove();

  // radar axes
  radarAxes = radar
    .selectAll(".axis")
    .data(numericDimensionsForRadar)
    .enter()
    .append("g")
    .attr("class", "axis");

  radarAxes
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", function (d, i) {
      return radarX(axisRadius(maxAxisRadius), i);
    })
    .attr("y2", function (d, i) {
      return radarY(axisRadius(maxAxisRadius), i);
    })
    .attr("class", "line")
    .style("stroke", "black");

  // Render grid lines in gray
  for (let level = 1; level <= 5; level++) {
    const gridData = numericDimensionsForRadar.map((d, i) => {
      // Use filtered dimensions for grid
      return {
        x: radarX(axisRadius((maxAxisRadius * level) / 5), i),
        y: radarY(axisRadius((maxAxisRadius * level) / 5), i),
      };
    });

    radar
      .append("polygon")
      .datum(gridData)
      .attr("points", function (d) {
        return d
          .map(function (p) {
            return [p.x, p.y].join(",");
          })
          .join(" ");
      })
      .attr("fill", "none")
      .attr("stroke", "gray")
      .attr("stroke-width", 0.5);
  }

  // Render axes labels with correct dimension names
  radar
    .selectAll(".axisLabel")
    .data(numericDimensionsForRadar) // Use filtered dimensions for labels
    .enter()
    .append("text")
    .attr("class", "axisLabel")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("x", function (d, i) {
      return radarX(axisRadius(textRadius), i);
    })
    .attr("y", function (d, i) {
      return radarY(axisRadius(textRadius), i);
    })
    .text(function (d) {
      return d;
    })
    .style("font-size", "10px");

  // init menu for the visual channels
  channels.forEach(function (c) {
    initMenu(c, dimensions);
  });

  // refresh all select menus
  channels.forEach(function (c) {
    refreshMenu(c);
  });

  renderScatterplot();
  renderRadarChart();
}

// clear visualizations before loading a new file
function clear() {
  scatter.selectAll("*").remove();
  radar.selectAll("*").remove();
  dataTable.selectAll("*").remove();

  // Clear selected data points
  selectedDataPoints = [];
  colorAssignments = {};

  // Clear legend
  d3.select("#legend").selectAll("*").remove();
  d3.select("#legend").append("b").text("Legend: ");
  d3.select("#legend")
    .append("span")
    .text("Click on scatterplot points to add them to radar chart");
}

//Create Table
function CreateDataTable(_data) {
  if (!_data || _data.length === 0) return;

  // Clear existing table
  dataTable.selectAll("*").remove();

  // Create table with class
  const table = dataTable.append("table").attr("class", "dataTableClass");

  // Add headers
  const thead = table.append("thead");
  const headerRow = thead.append("tr");

  const headers = Object.keys(_data[0]);
  headerRow
    .selectAll("th")
    .data(headers)
    .enter()
    .append("th")
    .text((d) => d)
    .attr("class", "tableHeaderClass");

  // Add rows & columns
  const tbody = table.append("tbody");
  const rows = tbody.selectAll("tr").data(_data).enter().append("tr");

  // Add mouseover event
  // Selecting cells
  rows
    .selectAll("td")
    .data(function (d) {
      return headers.map(function (header) {
        return { key: header, value: d[header], rowData: d };
      });
    })
    .enter()
    .append("td")
    .text((d) => d.value)
    .attr("class", "tableBodyClass")
    .on("mouseover", function (event, d) {
      d3.select(this).style("background-color", "lightblue");
      d3.select(this).style("cursor", "pointer");

      // Highlight corresponding points in visualizations
      highlightDataPoint(d.rowData);
    })
    .on("mouseout", function (event, d) {
      d3.select(this).style("background-color", "white");

      // Remove highlighting
      removeHighlight();
    });

  // Add table cells
  rows
    .selectAll("td")
    .data(function (d) {
      return headers.map(function (header) {
        return d[header];
      });
    })
    .enter()
    .append("td")
    .text((d) => d)
    .attr("class", "tableBodyClass");
}

function renderScatterplot() {
  if (!window.currentData || window.currentData.length === 0) return;

  // Get domain names from menu
  const xDimension = readMenu("scatterX");
  const yDimension = readMenu("scatterY");
  const sizeDimension = readMenu("size");

  // Label x- and y-axis
  xAxisLabel.text(xDimension);
  yAxisLabel.text(yDimension);

  // Update scales with current dimensions
  if (window.extents[xDimension]) {
    window.xScale.domain(window.extents[xDimension]);
  }
  if (window.extents[yDimension]) {
    window.yScale.domain(window.extents[yDimension]);
  }

  // Re-render axes
  xAxis.transition().duration(500).call(d3.axisBottom(window.xScale));
  yAxis.transition().duration(500).call(d3.axisLeft(window.yScale));

  // Size scale for dots
  let sizeScale = d3.scaleLinear().range([3, 15]);

  if (window.extents[sizeDimension]) {
    sizeScale.domain(window.extents[sizeDimension]);
  }

  // Render dots
  const dots = scatter.selectAll(".dot").data(window.currentData);

  dots
    .enter()
    .append("circle")
    .attr("class", "dot")
    .merge(dots)
    .transition()
    .duration(500)
    .attr("cx", (d) => window.xScale(+d[xDimension]))
    .attr("cy", (d) => window.yScale(+d[yDimension]))
    .attr("r", (d) => {
      const sizeValue = +d[sizeDimension];
      return isNaN(sizeValue) ? 5 : sizeScale(sizeValue);
    })
    .attr("fill", (d) => {
      const identifier = getDataPointIdentifier(d);
      return isSelected(d)
        ? colorAssignments[identifier] || unselectedColor
        : unselectedColor;
    })
    .attr("fill-opacity", 0.7)
    .attr("stroke", "black")
    .attr("stroke-width", (d) => (isSelected(d) ? 1 : 0.5));

  dots.exit().remove();
  scatter
    .selectAll(".dot")
    .on("mouseover", function (event, d) {
      if (!isSelected(d)) {
        d3.select(this).attr("fill", highlightColor).attr("stroke-width", 1);
      }

      // Show tooltip
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

      const allFieldsHtml = Object.entries(d)
        .map(([key, value]) => `<strong>${key}</strong>: ${value}`)
        .join("<br/>");

      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(`${allFieldsHtml}`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function (event, d) {
      if (!isSelected(d)) {
        d3.select(this).attr("fill", unselectedColor).attr("stroke-width", 1);
      }

      d3.select(this)
        .attr("stroke", "black")
        .attr("stroke-width", isSelected(d) ? 2 : 0.5);

      // Remove tooltip
      d3.selectAll(".tooltip").remove();
    })
    .on("click", function (event, d) {
      // Toggle selection
      toggleDataPointSelection(d);

      // Remove tooltip
      d3.selectAll(".tooltip").remove();
    });
}

function renderRadarChart() {
  if (!window.currentData || window.currentData.length === 0) return;

  // Clear existing radar elements (but keep axes and grid)
  radar.selectAll(".radarArea").remove();
  radar.selectAll(".radarStroke").remove();
  radar.selectAll(".radarCircle").remove();

  // Use selected data points instead of first 10 items
  if (selectedDataPoints.length === 0) {
    // Clear legend if no points selected
    const legend = d3.select("#legend");
    legend.selectAll("*").remove();
    legend.append("b").text("Legend: ");
    legend
      .append("span")
      .text("Click on scatterplot points to add them to radar chart");
    return;
  }

  // Filter numeric dimensions for radar chart
  const numericDimensions = dimensions.filter((dim) => {
    const values = window.currentData
      .map((d) => +d[dim])
      .filter((v) => !isNaN(v));
    return values.length > 0;
  });

  if (numericDimensions.length === 0) {
    console.log("No numeric dimensions found for radar chart");
    return;
  }

  // Update radar angle based on numeric dimensions
  radarAxesAngle = (Math.PI * 2) / numericDimensions.length;

  // Show selected items in legend with clickable X buttons
  const legend = d3.select("#legend");
  legend.selectAll("*").remove();
  legend.append("b").text("Legend: ");
  legend.append("br");

  selectedDataPoints.forEach((d, i) => {
    const identifier = getDataPointIdentifier(d);
    const pointColor = colorAssignments[identifier] || colorScale(i);
    const legendItem = legend
      .append("div")
      .style("display", "inline-block")
      .style("margin-right", "15px")
      .style("margin-bottom", "5px")
      .style("padding", "5px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "3px")
      .style("background-color", "#f9f9f9");

    legendItem
      .append("span")
      .style("display", "inline-block")
      .style("width", "12px")
      .style("height", "12px")
      .style("background-color", pointColor)
      .style("margin-right", "5px")
      .style("vertical-align", "middle");

    // Use first dimension as label (typically name/id)
    const label = d[dimensions[0]] || `Item ${i + 1}`;
    legendItem.append("span").text(label).style("vertical-align", "middle");

    // Add clickable X button
    legendItem
      .append("span")
      .text(" ✕")
      .style("margin-left", "8px")
      .style("color", "red")
      .style("cursor", "pointer")
      .style("font-weight", "bold")
      .style("vertical-align", "middle")
      .on("click", function () {
        // Remove this data point from selection
        const index = selectedDataPoints.findIndex(
          (selected) => selected === d
        );
        if (index !== -1) {
          const removedPoint = selectedDataPoints.splice(index, 1)[0];
          const identifier = getDataPointIdentifier(removedPoint);
          delete colorAssignments[identifier];
          updateScatterplotSelection();
          renderRadarChart();
        }
      })
      .on("mouseover", function () {
        d3.select(this).style("color", "darkred");
      })
      .on("mouseout", function () {
        d3.select(this).style("color", "red");
      });
  });

  // Render polylines in unique colors
  selectedDataPoints.forEach((dataPoint, i) => {
    const identifier = getDataPointIdentifier(dataPoint);
    const pointColor = colorAssignments[identifier] || colorScale(i);
    const lineData = numericDimensions.map((dim, dimIndex) => {
      const value = +dataPoint[dim];
      const normalizedValue = isNaN(value) ? 0 : value;

      // Use individual scale for each dimension
      let scale = d3
        .scaleLinear()
        .domain(window.extents[dim] || [0, 1])
        .range([0, radius * 0.75]);

      const scaledValue = scale(normalizedValue);

      return {
        x: radarX(scaledValue, dimIndex),
        y: radarY(scaledValue, dimIndex),
        dimension: dim,
        value: normalizedValue,
      };
    });

    // Close the polygon by adding the first point at the end
    if (lineData.length > 0) {
      lineData.push(lineData[0]);
    }

    // Create the radar area
    radar
      .append("polygon")
      .datum(lineData)
      .attr("class", "radarArea")
      .attr("points", function (d) {
        return d
          .map(function (p) {
            return [p.x, p.y].join(",");
          })
          .join(" ");
      })
      .attr("fill", pointColor)
      .attr("fill-opacity", 0.1)
      .attr("stroke", pointColor)
      .attr("stroke-width", 2)
      .on("mouseover", function () {
        d3.select(this).attr("fill-opacity", 0.3);

        // Highlight corresponding point in scatterplot
        scatter
          .selectAll(".dot")
          .attr("stroke-width", (d) =>
            d === dataPoint ? 4 : isSelected(d) ? 2 : 0.5
          );
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill-opacity", 0.1);

        // Reset scatterplot highlighting
        updateScatterplotSelection();
      });

    // Add circles at data points
    radar
      .selectAll(`.radarCircle-${i}`)
      .data(lineData.slice(0, -1)) // Remove duplicate first point
      .enter()
      .append("circle")
      .attr("class", `radarCircle radarCircle-${i}`)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 3)
      .attr("fill", pointColor)
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .on("mouseover", function (event, d) {
        // Show tooltip
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
          .html(`${d.dimension}: ${d.value}`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function () {
        d3.selectAll(".tooltip").remove();
      });
  });
}

function radarX(radius, index) {
  return radius * Math.cos(radarAngle(index));
}

function radarY(radius, index) {
  return radius * Math.sin(radarAngle(index));
}

function radarAngle(index) {
  return radarAxesAngle * index - Math.PI / 2;
}

// init scatterplot select menu
function initMenu(id, entries) {
  $("select#" + id).empty();

  entries.forEach(function (d) {
    $("select#" + id).append("<option>" + d + "</option>");
  });

  $("#" + id).selectmenu({
    select: function () {
      renderScatterplot();
    },
  });
}

// refresh menu after reloading data
function refreshMenu(id) {
  $("#" + id).selectmenu("refresh");
}

// read current scatterplot parameters
function readMenu(id) {
  return $("#" + id).val();
}

// switches and displays the tabs
function openPage(pageName, elmnt, color) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablink");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].style.backgroundColor = "";
  }
  document.getElementById(pageName).style.display = "block";
  elmnt.style.backgroundColor = color;
}
