//adapted from the cerner smart on fhir guide. updated to utalize client.js v2 library and FHIR R4
//import * as vis_observations from './vis_observations'

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
 *              { value: <numerical value 1>, units: <units>, time: <date/time of observation> },
 *              { value: <numerical value 2>, units: <units>, time: <date/time of observation> }
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
    if ((typeof observation_data == 'undefined') 
          || (observation_data.data.length == 0))
    {
        console.log ("undefined zero-data parameter passed");
        d3.select("div." + observation_data.display_location)
          .attr("style", "hidden");
        return;
    }

    // set the dimensions and margins of the graph
    var margin = {top: 50, right: 30, bottom: 30, left: 30},
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

    observation_data['data'].forEach(function(data) {
        data.time = get_d3_date_from_iso_datetime(data.time);
    });

    // X scale and axis - time line
    var xScale = d3.scaleTime()
        .domain(d3.extent(observation_data['data'], function(data){return data.time;}))
        .range([0, width]);
    
    svg_plot.append('g')
                .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale));

    // Y scale and axis - observation values
    var yScale = d3.scaleLinear()
                .domain([0, d3.max(observation_data['data'], function(data){return data.value;}) + 50])
                .range([height, 0]);
    
    svg_plot.append('g')
            .call(d3.axisLeft(yScale));

    var obs_line = d3.line()
                    .x(function(data) { return xScale(data.time);})
                    .y(function(data) { return yScale(data.value);})
                    .curve(d3.curveMonotoneX);

    var dataset = d3.range(num_observations).map(
                    function(data) {return {"value" : d3.randomUniform(1)()};}
                );

    if (observation_data.normal_range.max < 0)
                observation_data.normal_range.max = margin.top;
    if (observation_data.normal_range.min < 0)
                observation_data.normal_range.min = margin.bottom;
            
    svg_plot.append("line")
            .attr("x1", xScale(d3.min(observation_data['data'], function(data){return data.time;})))
            .attr("x2", xScale(d3.max(observation_data['data'], function(data){return data.time;})))
            .attr("y1", yScale(observation_data.normal_range.max))
            .attr("y2", yScale(observation_data.normal_range.max))
            .attr("stroke", "gray")
            .attr("stroke-width", "1");

    svg_plot.append("line")
            .attr("x1", xScale(d3.min(observation_data['data'], function(data){return data.time;})))
            .attr("x2", xScale(d3.max(observation_data['data'], function(data){return data.time;})))
            .attr("y1", yScale(observation_data.normal_range.min))
            .attr("y2", yScale(observation_data.normal_range.min))
            .attr("stroke", "gray")
            .attr("stroke-width", "1");

    svg_plot.append("rect")
            .attr("x", xScale(d3.min(observation_data['data'], function(data){return data.time;})))
            .attr("y", yScale(observation_data.normal_range.max))
            .attr("width", width)
            .attr("height", Math.abs(yScale(observation_data.normal_range.max) 
                            - yScale(observation_data.normal_range.min)))
            .attr("class", "normal_range_rect");

    svg_plot.append("path")
                .data([observation_data['data']])
                .attr("class", "line")
                .attr("d", obs_line);

    tooltip_div = d3.select("div." + observation_data.display_location)
                    .append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);
    
    var formatObsDate = d3.timeFormat("%e %B %Y");
    svg_plot.selectAll("dot")
            .data(observation_data['data'])
            .enter().append("circle")
                    .attr("class", "dot")
                    .attr("cx", function(data){ return xScale(data.time);})
                    .attr("cy", function(data){ return yScale(data.value);})
                    .attr("r", 5)
                    .on("mouseover", function(event, d){
                      tooltip_div.transition()
                                  .duration(200)
                                  .style("opacity", 0.9);
                      tooltip_div.html(formatObsDate(d.time) + "<br/>" 
                                        + Math.round(d.value * 1000)/1000 
                                        + " " + d.units)
                          .style("left", (event.pageX) + "px")
                          .style("top", (event.pageY - 50) + "px");
                        })
                    .on("mouseout", function(d){
                      tooltip_div.transition()
                                  .duration(500)
                                  .style("opacity", 0);
                      });
                    
    svg_plot.append("text")
            .attr("x", width/2)
            .attr("y", 0 - (margin.top / 2))
            .attr("class", "title_text")
            .text(observation_data.title);

    console.log("at the end of plot_observation()");
}


// helper function to process fhir resource to get the patient name.
function getPatientName(pt) {
  if (pt.name) {
    var names = pt.name.map(function(name) {
      return name.given.join(" ") + " " + name.family;
    });
    return names.join(" / ")
  } else {
    return "anonymous";
  }
}

// display the patient name gender and dob in the index page
function displayPatient(pt) {
  document.getElementById('patient_name').innerHTML = getPatientName(pt);
  document.getElementById('gender').innerHTML = pt.gender;
  document.getElementById('dob').innerHTML = pt.birthDate;
}

//function to display list of medications
function displayMedication(meds) {
  med_list.innerHTML += "<li> " + meds + "</li>";
}

//helper function to get quanity and unit from an observation resoruce.
function getQuantityValueAndUnit(ob) {
  if (typeof ob != 'undefined' &&
    typeof ob.valueQuantity != 'undefined' &&
    typeof ob.valueQuantity.value != 'undefined' &&
    typeof ob.valueQuantity.unit != 'undefined') {
    return Number(parseFloat((ob.valueQuantity.value)).toFixed(2)) + ' ' + ob.valueQuantity.unit;
  } else {
    return undefined;
  }
}

// helper function to get both systolic and diastolic bp
function getBloodPressureValue(BPObservations, typeOfPressure) {
  var formattedBPObservations = [];
  BPObservations.forEach(function(observation) {
    var BP = observation.component.find(function(component) {
      return component.code.coding.find(function(coding) {
        return coding.code == typeOfPressure;
      });
    });
    if (BP) {
      observation.valueQuantity = BP.valueQuantity;
      formattedBPObservations.push(observation);
    }
  });

  return getQuantityValueAndUnit(formattedBPObservations[0]);
}

// create a patient object to initalize the patient
function defaultPatient() {
  return {
    height: {
      value: ''
    },
    weight: {
      value: ''
    },
    sys: {
      value: ''
    },
    dia: {
      value: ''
    },
    ldl: {
      value: ''
    },
    hdl: {
      value: ''
    },
    note: 'No Annotation',
  };
}

//helper function to display the annotation on the index page
function displayAnnotation(annotation) {
  note.innerHTML = annotation;
}

//function to display the observation values you will need to update this
function displayObservation(obs) {
  hdl.innerHTML = obs.hdl;
  ldl.innerHTML = obs.ldl;
  sys.innerHTML = obs.sys;
  dia.innerHTML = obs.dia;
}

function prepare_plot_data (obs, display_location, normal_min, normal_max)
{
  console.log(obs)

  var obs_data_for_plotting = {};
  obs_data_for_plotting['title'] = 'No observations found';
  obs_data_for_plotting['display_location'] = display_location;
  obs_data_for_plotting['normal_range'] = {'min':normal_min, 'max': normal_max};
  obs_data_for_plotting['data'] = []

  for (var index = 0; index < obs.length; index++)
  {
      var obs_value = obs[index].valueQuantity.value;
      var data_units = obs[index].valueQuantity.unit;
      var obs_time = obs[index].effectiveDateTime;
      obs_data_for_plotting['data'].push({'value': obs_value, 
                                          'units': data_units, 
                                          'time': obs_time});
      if (index == 0)
      {
        obs_data_for_plotting['title'] = obs[index].code.text 
                                        + " (" +  data_units 
                                        + ") over time";
      }                         
  }
  return obs_data_for_plotting;
}

//once fhir client is authorized then the following functions can be executed
FHIR.oauth2.ready().then(function(client) {

    // get patient object and then display its demographics info in the banner
    client.request(`Patient/${client.patient.id}`).then(function(patient) {
        displayPatient(patient);
        console.log(patient);
    });

    // get observation resoruce values
    // you will need to update the below to retrive the weight and height values
    var query = new URLSearchParams();

    query.set("patient", client.patient.id);
    query.set("_count", 100);
    query.set("_sort", "-date");
    query.set("code", [
        'http://loinc.org|8462-4',
        'http://loinc.org|8480-6',
        'http://loinc.org|2085-9',
        'http://loinc.org|2089-1',
        'http://loinc.org|55284-4',
        'http://loinc.org|3141-9',
        'http://loinc.org|2093-3'
    ].join(","));

    client.request("Observation?" + query, { pageLimit: 0, flat: true})
            .then(
        function(ob) {
            // group all of the observation resoruces by type into their own
            var byCodes = client.byCodes(ob, 'code');
            var systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
            var diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
            var hdl = byCodes('2085-9');
            var ldl = byCodes('2089-1');
            var cholesterol = byCodes('2093-3');

            plot_observation(prepare_plot_data(cholesterol, 
                                              'total_cholesterol_visualisation', 
                                              125, 200));

            plot_observation(prepare_plot_data(hdl, 
                                                'hdl_visualisation', 
                                                40, -1));

            // plot_observation(prepare_plot_data(ldl, 
            //                                       'ldl_visualisation', 
            //                                       0, 100));
        }
    );

}).catch(console.error);
