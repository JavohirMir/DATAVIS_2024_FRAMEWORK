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

let lineChart, barChart, chart3, chart4;
let lineChartXAxis, lineChartYAxis, lineChartXAxisLabel, lineChartYAxisLabel;
let lineChartXScale, lineChartYScale;

// Dimensions for the line chart dropdown
const lineChartDimensions = ["Water_Level_m", "Surface_Area_km2", "Volume_km3"];
const xAxisDimension = "Year"; // The X-axis dimension for the line chart

// Label mapping
const labelMap = {
  Water_Level_m: "Water Level (m)",
  Surface_Area_km2: "Surface Area (km²)",
  Volume_km3: "Volume (km³)",
};

let riverData = []; // To store the parsed river data

// Expose initDashboard globally so dataVis.js can call it
window.dashboardInit = function (
  _mainData,
  _riverDataFilePath = "datasets/water_delivery_1992_2023.csv"
) {
  // Clear any existing dashboard elements before re-initializing
  clearDashboard();

  // Load the river data from the specified CSV file
  d3.csv(_riverDataFilePath, (d) => {
    // Convert relevant fields to numbers
    return {
      Year: +d.Year,
      AmuDarya_Growing_mln_m3: +d.AmuDarya_Growing_mln_m3,
      AmuDarya_NonGrowing_mln_m3: +d.AmuDarya_NonGrowing_mln_m3,
      AmuDarya_Total_mln_m3: +d.AmuDarya_Total_mln_m3,
      SyrDarya_Growing_mln_m3: +d.SyrDarya_Growing_mln_m3,
      SyrDarya_NonGrowing_mln_m3: +d.SyrDarya_NonGrowing_mln_m3,
      SyrDarya_Total_mln_m3: +d.SyrDarya_Total_mln_m3,
    };
  })
    .then((loadedRiverData) => {
      riverData = loadedRiverData;
      console.log("Loaded River Data from file:", riverData);

      // Initialize SVG containers for all charts
      lineChart = d3
        .select("#line-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

      barChart = d3
        .select("#barChart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`); // Add margin for barChart

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

      // Initialize menu for line chart
      initLineChartMenu("lineChartY", lineChartDimensions);

      // Define scales for line chart
      lineChartXScale = d3
        .scaleLinear()
        .range([0, width - margin.left - margin.right]);

      lineChartYScale = d3
        .scaleLinear()
        .range([height - margin.top - margin.bottom, 0]);

      // Append axes for line chart
      lineChartXAxis = lineChart
        .append("g")
        .attr("class", "x axis")
        .attr(
          "transform",
          `translate(0, ${height - margin.top - margin.bottom})`
        );

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

      // Render both charts
      renderLineChart();
      renderBarChart(riverData);
      createChart3();
      createChart4();
    })
    .catch((error) => {
      console.error("Error loading river data CSV:", error);
      // Optionally, display an error message to the user
    });
};

function initLineChartMenu(id, entries) {
  $("select#" + id).empty();

  entries.forEach(function (d) {
    $("select#" + id).append(
      "<option value='" + d + "'>" + labelMap[d] || d + "</option>"
    );
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
  const selectedDimensionLabel =
    labelMap[selectedDimension] || selectedDimension;
  lineChartYAxisLabel.text(selectedDimensionLabel);

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
          `<strong>Year</strong>: ${d[xAxisDimension]}<br/><strong>${
            labelMap[selectedDimension] || selectedDimension
          }</strong>: ${d[selectedDimension]}`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function (event, d) {
      d3.select(this).attr("r", 4).attr("fill", "steelblue");
      d3.selectAll(".tooltip").remove();
    });
}

function renderBarChart(_data) {
  if (!_data || _data.length === 0) {
    barChart.selectAll("*").remove();
    return;
  }

  barChart.selectAll("*").remove(); // Clear previous elements

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Define the keys for the grouped bars
  const riverTypes = ["AmuDarya_Total_mln_m3", "SyrDarya_Total_mln_m3"];
  const riverNames = {
    AmuDarya_Total_mln_m3: "Amu Darya",
    SyrDarya_Total_mln_m3: "Syr Darya",
  };
  const riverColors = d3
    .scaleOrdinal()
    .domain(riverTypes)
    .range(["#4CAF50", "#2196F3"]);

  // X0 scale for years
  const x0 = d3
    .scaleBand()
    .domain(_data.map((d) => d.Year))
    .range([0, chartWidth])
    .paddingInner(0.1);

  // X1 scale for river types within each year group
  const x1 = d3
    .scaleBand()
    .domain(riverTypes)
    .range([0, x0.bandwidth()])
    .padding(0.05);

  // Y scale for water volume
  const y = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(_data, (d) =>
        Math.max(d.AmuDarya_Total_mln_m3, d.SyrDarya_Total_mln_m3)
      ),
    ])
    .nice()
    .range([chartHeight, 0]);

  // Append X-axis
  barChart
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(x0).tickFormat(d3.format("d")))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");

  // Append Y-axis
  barChart.append("g").attr("class", "y axis").call(d3.axisLeft(y));

  // Add Y-axis label
  barChart
    .append("text")
    .attr("class", "y label")
    .attr("text-anchor", "start")
    .attr("y", -margin.top / 2)
    .attr("x", 0)
    .text("Water Delivery (mln m³)");

  // Create groups for each year
  const yearGroups = barChart
    .selectAll(".year-group")
    .data(_data)
    .enter()
    .append("g")
    .attr("class", "year-group")
    .attr("transform", (d) => `translate(${x0(d.Year)},0)`);

  // Append bars for each river type within the year group
  yearGroups
    .selectAll("rect")
    .data((d) =>
      riverTypes.map((key) => ({ key: key, value: d[key], year: d.Year }))
    )
    .enter()
    .append("rect")
    .attr("x", (d) => x1(d.key))
    .attr("y", (d) => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => chartHeight - y(d.value))
    .attr("fill", (d) => riverColors(d.key))
    .on("mouseover", function (event, d) {
      d3.select(this).attr("opacity", 0.7);

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
          `<strong>Year</strong>: ${d.year}<br/><strong>${
            riverNames[d.key]
          }</strong>: ${d.value} mln m³`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("opacity", 1);
      d3.selectAll(".tooltip").remove();
    });

  // Add a legend for the bar chart
  const legendChart2 = barChart
    .append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("text-anchor", "end")
    .selectAll("g")
    .data(riverTypes.slice().reverse())
    .enter()
    .append("g")
    .attr("transform", (d, i) => `translate(0,${i * 20})`);

  legendChart2
    .append("rect")
    .attr("x", chartWidth - 19)
    .attr("width", 19)
    .attr("height", 19)
    .attr("fill", riverColors);

  legendChart2
    .append("text")
    .attr("x", chartWidth - 24)
    .attr("y", 9.5)
    .attr("dy", "0.32em")
    .text((d) => riverNames[d]);
}

function createChart3() {
  chart3.selectAll("*").remove(); // Clear previous elements

  // Aral Sea timelapse data
  const aralSeaYears = [
    1974, 1984, 1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992,
    1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002,
    2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012,
    2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020
  ];

  let currentImageIndex = 0;
  let isPlaying = false;
  let playSpeed = 500; // milliseconds
  let playInterval;

  // Create container for the timelapse
  const timelapseContainer = chart3
    .append("g")
    .attr("class", "timelapse-container");

  // Create image display area
  const imageContainer = timelapseContainer
    .append("foreignObject")
    .attr("x", 50)
    .attr("y", 30)
    .attr("width", width - 100)
    .attr("height", height - 120);

  const imageDiv = imageContainer
    .append("xhtml:div")
    .style("position", "relative")
    .style("width", "100%")
    .style("height", "100%")
    .style("overflow", "hidden");

  // Create two image elements for smooth transitions
  const image1 = imageDiv
    .append("xhtml:img")
    .style("position", "absolute")
    .style("top", "0")
    .style("left", "0")
    .style("width", "100%")
    .style("height", "100%")
    .style("object-fit", "contain")
    .style("opacity", "1")
    .style("transition", "opacity 0.3s ease-in-out");

  const image2 = imageDiv
    .append("xhtml:img")
    .style("position", "absolute")
    .style("top", "0")
    .style("left", "0")
    .style("width", "100%")
    .style("height", "100%")
    .style("object-fit", "contain")
    .style("opacity", "0")
    .style("transition", "opacity 0.3s ease-in-out");

  let activeImage = image1;
  let inactiveImage = image2;

  // Initialize with first image
  activeImage.attr("src", `ARAL SEA/${aralSeaYears[0]}.png`);

  // Year display
  const yearDisplay = timelapseContainer
    .append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .attr("font-weight", "bold")
    .text(aralSeaYears[0]);

  // Controls container
  const controlsContainer = timelapseContainer
    .append("foreignObject")
    .attr("x", 0)
    .attr("y", height - 80)
    .attr("width", width)
    .attr("height", 80);

  const controlsDiv = controlsContainer
    .append("xhtml:div")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "center")
    .style("gap", "10px")
    .style("padding", "10px");

  // Play controls row
  const playControlsDiv = controlsDiv
    .append("xhtml:div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "10px");

  // Previous button
  const prevButton = playControlsDiv
    .append("xhtml:button")
    .text("◀")
    .style("padding", "5px 10px")
    .style("cursor", "pointer")
    .on("click", () => {
      if (currentImageIndex > 0) {
        currentImageIndex--;
        updateImage();
      }
    });

  // Play/Pause button
  const playButton = playControlsDiv
    .append("xhtml:button")
    .text("▶")
    .style("padding", "5px 10px")
    .style("cursor", "pointer")
    .on("click", togglePlay);

  // Next button
  const nextButton = playControlsDiv
    .append("xhtml:button")
    .text("▶")
    .style("padding", "5px 10px")
    .style("cursor", "pointer")
    .on("click", () => {
      if (currentImageIndex < aralSeaYears.length - 1) {
        currentImageIndex++;
        updateImage();
      }
    });

  // Speed controls row
  const speedControlsDiv = controlsDiv
    .append("xhtml:div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "10px");

  speedControlsDiv
    .append("xhtml:span")
    .text("Speed:");

  const speedSlider = speedControlsDiv
    .append("xhtml:input")
    .attr("type", "range")
    .attr("min", "100")
    .attr("max", "2000")
    .attr("value", playSpeed)
    .style("width", "150px")
    .on("input", function() {
      playSpeed = +this.value;
      if (isPlaying) {
        clearInterval(playInterval);
        startPlay();
      }
    });

  const speedDisplay = speedControlsDiv
    .append("xhtml:span")
    .text(`${playSpeed}ms`);

  // Year slider
  const yearSliderDiv = controlsDiv
    .append("xhtml:div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "10px")
    .style("width", "80%");

  yearSliderDiv
    .append("xhtml:span")
    .text("Year:");

  const yearSlider = yearSliderDiv
    .append("xhtml:input")
    .attr("type", "range")
    .attr("min", "0")
    .attr("max", aralSeaYears.length - 1)
    .attr("value", "0")
    .style("flex", "1")
    .on("input", function() {
      currentImageIndex = +this.value;
      updateImage();
    });

  function updateImage() {
    const newYear = aralSeaYears[currentImageIndex];
    const newImageSrc = `ARAL SEA/${newYear}.png`;
    
    // Load new image in inactive image element
    inactiveImage.attr("src", newImageSrc);
    
    // Fade out active image and fade in inactive image
    activeImage.style("opacity", "0");
    inactiveImage.style("opacity", "1");
    
    // Swap references
    const temp = activeImage;
    activeImage = inactiveImage;
    inactiveImage = temp;
    
    // Update displays
    yearDisplay.text(newYear);
    yearSlider.property("value", currentImageIndex);
  }

  function startPlay() {
    playInterval = setInterval(() => {
      if (currentImageIndex < aralSeaYears.length - 1) {
        currentImageIndex++;
        updateImage();
      } else {
        // Loop back to start
        currentImageIndex = 0;
        updateImage();
      }
    }, playSpeed);
  }

  function togglePlay() {
    if (isPlaying) {
      clearInterval(playInterval);
      playButton.text("▶");
      isPlaying = false;
    } else {
      startPlay();
      playButton.text("⏸");
      isPlaying = true;
    }
  }

  // Update speed display when slider changes
  speedSlider.on("input", function() {
    playSpeed = +this.value;
    speedDisplay.text(`${playSpeed}ms`);
    if (isPlaying) {
      clearInterval(playInterval);
      startPlay();
    }
  });
}

function createChart4() {
  chart4.selectAll("*").remove(); // Clear previous elements
  chart4
    .append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .text("Chart 4 Placeholder");
}

// clear files if changes in the datasets occur
function clearDashboard() {
  // Select all SVG elements within the dashboard containers and remove them
  d3.select("#line-chart").selectAll("svg").remove();
  d3.select("#barChart").selectAll("svg").remove();
  d3.select("#chart3").selectAll("svg").remove();
  d3.select("#chart4").selectAll("svg").remove();
}
