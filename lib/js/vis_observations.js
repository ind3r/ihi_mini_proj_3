import * as d3 from "./d3"

function get_d3_date_from_iso_datetime(date_string)
{
    var date_and_time = date_string.split('T');
    var timeParser = d3.timeParse("%Y-%m-%d");
    return timeParser(date_and_time[0]);
}

/**
 * The plot_observation function can be used to plot lab observations
 * from the data that is supplied to it as an argument.
 * 
 * The expected format is as follows:
 * {
 *      title: <title of the plot>,
 *      display_location: <div class in which the plot should be drawn>,
 *      data: [
 *              { vaue: <numerical value 1>, time: <date/time of observation> },
 *              { vaue: <numerical value 2>, time: <date/time of observation> }
 *                  . . .
 *            ],
 *      normal_range: {min: <min value>, max: <max value>}
 * }
 * Note: the date time values are expected to be in an ISO format string
 * 
 * @param {Object} observation_data 
 */
function plot_observation(observation_data)
{
    if (typeof observation_data == 'undefined')
    {
        console.log ("undefined/null function parameter passed")
        return;
    }

    // set the dimensions and margins of the graph
    var margin = {top: 30, right: 30, bottom: 30, left: 30},
        width = (0.8 * window.innerWidth) - margin.right - margin.left,
        height = (0.8 * window.innerHeight) - margin.top - margin.bottom;

    const num_observations = observation_data.data.length;

    var svg_plot = d3.select("div." + observation_data.display_location)
                    .append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                        .attr("transform",
                            "translate(" + margin.left + "," + margin.top + ")");

    // X scale and axis - time line
    var xScale = d3.scaleTime()
        .domain([0, num_observations - 1])  // number of x values 
        .range([0, width]);
    
    svg_plot.append('g')
                .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale));

    // Y scale and axis - observation values
    var yScale = d3.scaleLinear()
                .domain([0, 200])
                .range([height, 0]);
    
    svg_plot.append('g')
            .call(d3.axisLeft(yScale));

    var obs_line = d3.line()
                    .x(function(data, index) { return xScale(index);})
                    .y(function(data, index) { return yScale(data.value);})
                    .curve(d3.curveMonotoneX);

    var dataset = d3.range(num_observations).map(
                    function(data) {return {"value" : d3.randomUniform(1)()};}
                );

    svg_plot.append("path")
                .datum(observation_data['data'])
                .enter().append("circle")
                        .attr("class", "dot")
                        .attr("cx", function(data, index){return xScale(get_d3_date_from_iso_datetime(data.time));})
                        .attr("cy", function(data, index){return yScale(data.value);})
                        .attr("r", 5);
    // svg_plot                
    // .selectAll("whatever")
    // .data(data)
    // .enter()
    // .append("circle")
    //     .attr("cx", function(d){ return x(d.x) })
    //     .attr("cy", function(d){ return y(d.y) })
    //     .attr("r", 7);

    console.log("at the end of plot_observation()");
}
