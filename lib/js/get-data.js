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

    observation_data['data'].forEach(function(data) {
        data.time = get_d3_date_from_iso_datetime(data.time);
    });

    // X scale and axis - time line
    var xScale = d3.scaleTime()
        .domain(d3.extent(observation_data['data'], function(data){return data.time;}))
        // .domain([observation_data['data'][0].time, 
        //         observation_data['data'][num_observations - 1].time])
        .range([0, width]);
    
    svg_plot.append('g')
                .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale));

    // Y scale and axis - observation values
    var yScale = d3.scaleLinear()
                .domain([0, d3.max(observation_data['data'], function(data){return data.value;}) + 50])
                //.domain([0, 200])
                .range([height, 0]);
    
    svg_plot.append('g')
            .call(d3.axisLeft(yScale));

    var obs_line = d3.line()
                    .x(function(data) { console.log("line x: " + data.time); return xScale(data.time);})
                    .y(function(data) { console.log("line y: " + data.value); return yScale(data.value);});
                    //.curve(d3.curveMonotoneX);

    var dataset = d3.range(num_observations).map(
                    function(data) {return {"value" : d3.randomUniform(1)()};}
                );

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

    svg_plot.append("path")
                .data([observation_data['data']])
                .attr("class", "line")
                .attr("d", obs_line);

    svg_plot.selectAll("dot")
            .data(observation_data['data'])
            .enter().append("circle")
                    .attr("class", "dot")
                    .attr("cx", function(data){ console.log("dot x: " + data.time); return xScale(data.time);})
                    .attr("cy", function(data){ console.log("dot y: " + data.value); return yScale(data.value);})
                    .attr("r", 5);            

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
            console.log(cholesterol)

            var cholesterol_obs_data = {};
            cholesterol_obs_data['title'] = 'Total Cholesterol Observations for ' 
                                            + getPatientName(client.patient);
            cholesterol_obs_data['display_location'] = 'visualisation_area';
            cholesterol_obs_data['normal_range'] = {'min':125, 'max': 200};
            cholesterol_obs_data['data'] = []

            console.log("number of total cholesterol observations: " + cholesterol.length)
            for (var index = 0; index < cholesterol.length; index++)
            {
                var obs_value = cholesterol[index].valueQuantity.value;
                var obs_time = cholesterol[index].effectiveDateTime;
                cholesterol_obs_data['data'].push({'value': obs_value, 'time': obs_time});
            }
            console.log(cholesterol_obs_data['data']);
            plot_observation(cholesterol_obs_data);

            // create patient object
            // var p = defaultPatient();

            // set patient value parameters to the data pulled from the observation resoruce
            // if (typeof systolicbp != 'undefined') {
            // p.sys = systolicbp;
            // } else {
            // p.sys = 'undefined'
            // }

            // if (typeof diastolicbp != 'undefined') {
            // p.dia = diastolicbp;
            // } else {
            // p.dia = 'undefined'
            // }

            // p.hdl = getQuantityValueAndUnit(hdl[0]);
            // p.ldl = getQuantityValueAndUnit(ldl[0]);

            // displayObservation(p)
        }
    );


    // // dummy data for medrequests
    // var medResults = ["SAMPLE Lasix 40mg","SAMPLE Naproxen sodium 220 MG Oral Tablet","SAMPLE Amoxicillin 250 MG"]

    // // get medication request resources this will need to be updated
    // // the goal is to pull all the medication requests and display it in the app. It can be both active and stopped medications
    // medResults.forEach(function(med) {
    // displayMedication(med);
    // })

    // //update function to take in text input from the app and add the note for the latest weight observation annotation
    // //you should include text and the author can be set to anything of your choice. keep in mind that this data will
    // // be posted to a public sandbox
    // function addWeightAnnotation() {
    // var annotation = "test annotation"
    // displayAnnotation(annotation);

    // }

    // //event listner when the add button is clicked to call the function that will add the note to the weight observation
    // document.getElementById('add').addEventListener('click', addWeightAnnotation);


}).catch(console.error);
