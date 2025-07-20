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

let lineChart,
  barChart,
  chart3,
  temperatureHeatmap,
  monthlyTemperatureLineChart,
  lineChartXAxis,
  lineChartYAxis,
  lineChartXAxisLabel,
  lineChartYAxisLabel,
  lineChartXScale,
  lineChartYScale;
const lineChartDimensions = ["Water_Level_m", "Surface_Area_km2", "Volume_km3"];
const xAxisDimension = "Year";

// Label mapping
const labelMap = {
  Water_Level_m: "Water Level (m)",
  Surface_Area_km2: "Surface Area (km²)",
  Volume_km3: "Volume (km³)",
  Sedimentation: "Sedimentation",
  "Seimentation in coastal zone": "Coastal Sedimentation",
  Ice: "Ice Melt",
  Total: "Total Influx",
};

// Months mapping for readability and order
const monthsMap = {
  I: "Jan",
  II: "Feb",
  III: "Mar",
  IV: "Apr",
  V: "May",
  VI: "Jun",
  VII: "Jul",
  VIII: "Aug",
  IX: "Sep",
  X: "Oct",
  XI: "Nov",
  XII: "Dec",
};
const orderedMonthKeys = Object.keys(monthsMap);
const orderedMonthNames = Object.values(monthsMap);

let riverData = [];
let temperatureDataRaw = [];
let temperatureDataHeatmap = [];
let selectedHeatmapYear = null;

window.dashboardInit = function (
  _mainData,
  _riverDataFilePath = "datasets/water_delivery_1992_2023.csv",
  _temperatureFilePath = "datasets/av_temperature.csv"
) {
  clearDashboard();

  const loadRiverData = d3.csv(_riverDataFilePath, (d) => {
    return {
      Year: +d.Year,
      AmuDarya_Growing_mln_m3: +d.AmuDarya_Growing_mln_m3,
      AmuDarya_NonGrowing_mln_m3: +d.AmuDarya_NonGrowing_mln_m3,
      AmuDarya_Total_mln_m3: +d.AmuDarya_Total_mln_m3,
      SyrDarya_Growing_mln_m3: +d.SyrDarya_Growing_mln_m3,
      SyrDarya_NonGrowing_mln_m3: +d.SyrDarya_NonGrowing_mln_m3,
      SyrDarya_Total_mln_m3: +d.SyrDarya_Total_mln_m3,
    };
  });

  // Load the temperature data from the specified CSV file
  const loadTemperatureData = d3.csv(_temperatureFilePath, (d) => {
    return {
      Year: +d.Year,
      Month: d.Month,
      Temperature: +d.Temperature,
    };
  });

  Promise.all([loadRiverData, loadTemperatureData])
    .then((results) => {
      riverData = results[0];
      temperatureDataRaw = results[1];
      console.log("Loaded River Data from file:", riverData);
      console.log("Loaded Temperature Raw Data from file:", temperatureDataRaw);

      temperatureDataHeatmap = Array.from(
        d3.group(temperatureDataRaw, (d) => d.Year),
        ([key, value]) => {
          const row = { Year: key };
          orderedMonthKeys.forEach((monthKey) => {
            const monthEntry = value.find((d) => d.Month === monthKey);
            row[monthKey] = monthEntry ? monthEntry.Temperature : undefined;
          });
          return row;
        }
      ).sort((a, b) => a.Year - b.Year);

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
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

      chart3 = d3
        .select("#chart3")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g");

      // Initialize new SVG containers for temperature charts
      temperatureHeatmap = d3
        .select("#temperatureHeatmap")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

      monthlyTemperatureLineChart = d3
        .select("#monthlyTemperatureLineChart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

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

      // Render all charts
      renderLineChart();
      renderBarChart(riverData);
      createChart3();
      renderTemperatureHeatmap(temperatureDataHeatmap);
      if (temperatureDataRaw.length > 0) {
        selectedHeatmapYear = temperatureDataRaw[0].Year;
        renderMonthlyTemperatureLineChart(
          temperatureDataRaw,
          selectedHeatmapYear
        );
      }
    })
    .catch((error) => {
      console.error("Error loading dashboard data:", error);
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
    console.warn("Required dimensions for line chart not found in data.");
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

  // Add circles for data points
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
      d3.select(this).attr("r", 6).attr("fill", "red");

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

  barChart.selectAll("*").remove();

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
    .style("cursor", "pointer")
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
  chart3.selectAll("*").remove();

  // Aral Sea timelapse data
  const aralSeaYears = [
    1974, 1984, 1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994,
    1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006,
    2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018,
    2019, 2020,
  ];

  let currentImageIndex = 0;
  let isPlaying = false;
  let playSpeed = 500;
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

  // Create single image element for direct timelapse
  const timelapseImage = imageDiv
    .append("xhtml:img")
    .style("position", "absolute")
    .style("top", "0")
    .style("left", "0")
    .style("width", "100%")
    .style("height", "100%")
    .style("object-fit", "contain");

  let imageCache = {};

  // Preload all images for smooth transitions
  function preloadImages() {
    aralSeaYears.forEach((year) => {
      const img = new Image();
      img.src = `ARAL SEA/${year}.png`;
      imageCache[year] = img;
    });
  }

  // Initialize with first image and start preloading
  timelapseImage.attr("src", `datasets/images/${aralSeaYears[0]}.png`);
  preloadImages();

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
    .text("▶▶")
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

  speedControlsDiv.append("xhtml:span").text("Speed:");

  const speedSlider = speedControlsDiv
    .append("xhtml:input")
    .attr("type", "range")
    .attr("min", "100")
    .attr("max", "2000")
    .attr("value", playSpeed)
    .style("width", "150px")
    .on("input", function () {
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

  yearSliderDiv.append("xhtml:span").text("Year:");

  const yearSlider = yearSliderDiv
    .append("xhtml:input")
    .attr("type", "range")
    .attr("min", "0")
    .attr("max", aralSeaYears.length - 1)
    .attr("value", "0")
    .style("flex", "1")
    .on("input", function () {
      currentImageIndex = +this.value;
      updateImage();
    });

  function updateImage() {
    const newYear = aralSeaYears[currentImageIndex];
    const newImageSrc = `ARAL SEA/${newYear}.png`;

    // Direct image swap
    timelapseImage.attr("src", newImageSrc);

    // Update displays immediately
    yearDisplay.text(newYear);
    yearSlider.property("value", currentImageIndex);
  }

  function startPlay() {
    playInterval = setInterval(() => {
      if (currentImageIndex < aralSeaYears.length - 1) {
        currentImageIndex++;
        updateImage();
      } else {
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
  speedSlider.on("input", function () {
    playSpeed = +this.value;
    speedDisplay.text(`${playSpeed}ms`);
    if (isPlaying) {
      clearInterval(playInterval);
      startPlay();
    }
  });
}

function renderTemperatureHeatmap(_data) {
  temperatureHeatmap.selectAll("*").remove();

  const chartWidth = width - margin.left - margin.right - 80;
  const chartHeight = height - margin.top - margin.bottom - 10;
  const years = Array.from(new Set(_data.map((d) => d.Year))).sort(
    d3.ascending
  );
  const months = orderedMonthNames;

  // Scales
  const xScale = d3
    .scaleBand()
    .domain(months)
    .range([0, chartWidth])
    .paddingInner(0)
    .paddingOuter(0);

  const yScale = d3
    .scaleBand()
    .domain(years)
    .range([chartHeight, 0])
    .paddingInner(0)
    .paddingOuter(0);

  const minTemp = d3.min(temperatureDataRaw, (d) => d.Temperature);
  const maxTemp = d3.max(temperatureDataRaw, (d) => d.Temperature);
  const colorScale = d3
    .scaleSequential(d3.interpolateRdYlBu)
    .domain([maxTemp, minTemp]);

  // Add X-axis (Months)
  temperatureHeatmap
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");

  // Add Y-axis (Years)
  temperatureHeatmap
    .append("g")
    .attr("class", "y axis")
    .call(d3.axisLeft(yScale).tickFormat(d3.format("d")));

  // Append cells
  const heatmapCellsData = [];
  _data.forEach((yearRow) => {
    orderedMonthKeys.forEach((monthKey) => {
      if (yearRow[monthKey] !== undefined) {
        heatmapCellsData.push({
          year: yearRow.Year,
          monthKey: monthKey,
          monthName: monthsMap[monthKey],
          temperature: yearRow[monthKey],
        });
      }
    });
  });

  temperatureHeatmap
    .selectAll(".month-cell")
    .data(heatmapCellsData)
    .enter()
    .append("rect")
    .attr("class", (d) => `month-cell year-${d.year}`)
    .attr("x", (d) => xScale(d.monthName))
    .attr("y", (d) => yScale(d.year))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", (d) => colorScale(d.temperature))
    .on("click", function (event, d) {
      // Remove highlight from previously selected year's cells
      temperatureHeatmap
        .selectAll(".month-cell")
        .classed("selected-highlight", false)
        .style("stroke", null)
        .style("stroke-width", null);

      // Add highlight to all cells of the selected year
      temperatureHeatmap
        .selectAll(`.month-cell.year-${d.year}`)
        .classed("selected-highlight", true)
        .style("stroke", "#00FF00")
        .style("stroke-width", 2);

      // Update the monthly line chart
      selectedHeatmapYear = d.year;
      renderMonthlyTemperatureLineChart(
        temperatureDataRaw,
        selectedHeatmapYear
      );
    })
    .on("mouseover", function (event, d) {
      // Apply hover highlight
      if (!d3.select(this).classed("selected-highlight")) {
        d3.select(this)
          .style("stroke", "#FFFF00")
          .style("stroke-width", 2)
          .style("cursor", "pointer");
      }

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
          `<strong>Year</strong>: ${d.year}<br/><strong>Month</strong>: ${d.monthName}<br/><strong>Temp</strong>: ${d.temperature}°C`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function () {
      // Remove hover highlight
      if (!d3.select(this).classed("selected-highlight")) {
        d3.select(this).style("stroke", "none");
      }
      d3.selectAll(".tooltip").remove();
    });

  // Add X-axis label
  temperatureHeatmap
    .append("text")
    .attr("fill", "black")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + margin.bottom + 10)
    .style("text-anchor", "middle")
    .text("Month");

  // Add Y-axis label
  temperatureHeatmap
    .append("text")
    .attr("fill", "black")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - chartHeight / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Year");

  // Add a color legend
  const legendWidth = 20;
  const legendHeight = 200;

  const legendScale = d3
    .scaleLinear()
    .domain([minTemp, maxTemp])
    .range([legendHeight, 0]);

  const legendAxis = d3.axisRight(legendScale).ticks(5);

  const legendGradient = temperatureHeatmap
    .append("defs")
    .append("linearGradient")
    .attr("id", "temp-gradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");

  legendGradient
    .selectAll("stop")
    .data(d3.range(0, 1.01, 0.1))
    .enter()
    .append("stop")
    .attr("offset", (d) => d * 100 + "%")
    .attr("stop-color", (d) => colorScale(minTemp + d * (maxTemp - minTemp)));

  temperatureHeatmap
    .append("rect")
    .attr("x", chartWidth + 20)
    .attr("y", 0)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#temp-gradient)");

  temperatureHeatmap
    .append("g")
    .attr("class", "legend-axis")
    .attr("transform", `translate(${chartWidth + 20 + legendWidth}, 0)`)
    .call(legendAxis);

  temperatureHeatmap
    .append("text")
    .attr("x", chartWidth + 20 + legendWidth / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .text("Temp (°C)");
}

function renderMonthlyTemperatureLineChart(_dataRaw, selectedYear) {
  monthlyTemperatureLineChart.selectAll("*").remove();

  if (!selectedYear) {
    d3.select("#selectedYearDisplay").text("");
    return;
  }

  d3.select("#selectedYearDisplay").text(`- Year ${selectedYear}`);

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom - 10;

  // Filter raw data for the selected year
  const yearDataRaw = _dataRaw.filter((d) => d.Year === selectedYear);

  if (yearDataRaw.length === 0) {
    monthlyTemperatureLineChart
      .append("text")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .text("No data for this year.");
    return;
  }

  const monthlyData = orderedMonthKeys
    .map((monthKey) => {
      const entry = yearDataRaw.find((d) => d.Month === monthKey);
      return {
        monthKey: monthKey,
        monthName: monthsMap[monthKey],
        value: entry ? entry.Temperature : undefined,
      };
    })
    .filter((d) => d.value !== undefined);

  // Scales
  const xScale = d3
    .scalePoint()
    .domain(monthlyData.map((d) => d.monthName))
    .range([0, chartWidth])
    .padding(0.5);

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(monthlyData, (d) => d.value))
    .nice()
    .range([chartHeight, 0]);

  // Define the line generator
  const line = d3
    .line()
    .x((d) => xScale(d.monthName))
    .y((d) => yScale(d.value));

  // Append X-axis
  monthlyTemperatureLineChart
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xScale));

  // Append Y-axis
  monthlyTemperatureLineChart
    .append("g")
    .attr("class", "y axis")
    .call(d3.axisLeft(yScale));

  // Add X-axis label
  monthlyTemperatureLineChart
    .append("text")
    .attr("fill", "black")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + margin.bottom / 2 + 10)
    .attr("dy", "0.71em")
    .style("text-anchor", "middle")
    .text("Month");

  // Add Y-axis label
  monthlyTemperatureLineChart
    .append("text")
    .attr("fill", "black")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left + 10)
    .attr("x", 0 - chartHeight / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Temperature (°C)");

  // Draw the line
  monthlyTemperatureLineChart
    .append("path")
    .datum(monthlyData)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Add circles for data points
  monthlyTemperatureLineChart
    .selectAll(".dot")
    .data(monthlyData)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", (d) => xScale(d.monthName))
    .attr("cy", (d) => yScale(d.value))
    .attr("r", 4)
    .attr("fill", "steelblue")
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("r", 6).attr("fill", "red");

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
          `<strong>Month</strong>: ${d.monthName}<br/><strong>Temp</strong>: ${d.value}°C`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("r", 4).attr("fill", "steelblue");
      d3.selectAll(".tooltip").remove();
    });
}

// clear files if changes in the datasets occur
function clearDashboard() {
  d3.select("#line-chart").selectAll("svg").remove();
  d3.select("#barChart").selectAll("svg").remove();
  d3.select("#chart3").selectAll("svg").remove();
  d3.select("#temperatureHeatmap").selectAll("svg").remove();
  d3.select("#monthlyTemperatureLineChart").selectAll("svg").remove();
}
