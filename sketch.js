const api_key = "bE3KmPllRJGRqO91CGDKcxXpyUgyrWKxbsAlYZhFjHglPJTyea66eqLxfelACxFZ"
let data
let step = 6

const labelList = [
  "blue",
  "red"
]
const epochs = 50
const lr = 0.1
const hidden_units = 3

let lowest_loss

let model
let xs, ys

let loadedEvents = 0
let initiatedEvents = 0
let intervalId

// let lossP
// let errorText
// let predictP
// let blue, red
// let matchNum, eventCode, matchType
// let predictButton

let lossVals

// function saveData() {
//   saveJSON(data, `data${step}.json`)
// }

// function preload() {
//   if (step < 7) {
//     data = loadJSON(`data${step === 0 ? 0 : step-1}.json`)
//   } else {
//     data = loadJSON(`data5.json`)
//   }
//   lossP = createP('loss: ')
//   errorText = createP('INPUT ONLY TEAM NUMBERS')
//   eventCode = createInput('')
//   eventCode.attribute('placeholder', 'Event Code')
//   matchNum = createInput('', 'number')
//   matchNum.attribute('placeholder', 'Match Number')
//   matchType = createRadio()
//   matchType.option('qm')
//   matchType.option('ef')
//   matchType.option('qf')
//   matchType.option('sf')
//   matchType.option('f')
//   predictButton = createButton('predict')
//   predictButton.mousePressed(predict)
//   predictP = createP('')
// }

$(document).ready(() => {
  init()
})

function init() {
  let file
  if (step < 7) {
    file = `data${step === 0 ? 0 : step-1}.json`
  } else {
    file = 'data5.json'
  }
  $.getJSON(file, (results) => {
    data = results
    initSteps()
  })
}

function initSteps() {
  if (step === 0) {
    loadTeamKeys()
  } else if (step === 1) {
    loadEvents()
  } else if (step === 2) {
    loadOprDpr()
  } else if (step === 3) {
    averageOprDpr()
  } else if (step === 4) {
    generateTrainingData()
  } else if (step === 5) {
    splitData()
  } else if (step === 6) {
    trainWithData()
    calculateWinPercentages()
  } else if (step === 7) {
    console.log('sdsd')
    testModelWithData()
  }
}

function loadTeamKeys() {
  data.keys = []
  let loadedPages = 0
  for(let i = 0; i < 15; i++) {
    $.ajax({
      url: `https://www.thebluealliance.com/api/v3/teams/2018/${i}/keys`,
      headers: {
          "X-TBA-Auth-Key": api_key
      },
      success: (results) => {
        loadedPages++
        data.keys = data.keys.concat(results)
        //console.log(data.keys)
        if(loadedPages === 15) {
          saveData()
        }
      },
      error: (err) => {
          console.log('Error loading data')
          console.error(err)
      }
    })
  }
}

function loadEvents() {
  $.ajax({
    url: `https://www.thebluealliance.com/api/v3/events/2018/keys`,
    headers: {
        "X-TBA-Auth-Key": api_key
    },
    success: (results) => {
      data.events = results
      saveData()
    },
    error: (err) => {
        console.log('Error loading data')
        console.error(err)
    }
  })
}

function loadOprDpr() {
  data.teams = {}
  //alert('Ready?')
  intervalId = setInterval(loadEventOprDpr, 500)
}

function loadEventOprDpr() {
  $.ajax({
    url: `https://www.thebluealliance.com/api/v3/event/${data.events[initiatedEvents]}/oprs`,
    headers: {
        "X-TBA-Auth-Key": api_key
    },
    timeout: 3000,
    beforeSend: () => {
      initiatedEvents++
      console.log('Initiated events: ' + initiatedEvents)
      //console.log('Total Events: ' + data.events.length)
      if (initiatedEvents >= data.events.length - 1) {
        console.log("all event's initiated")
        clearInterval(intervalId)
      }
    },
    success: (results) => {
      if(!results) {
        console.error('Null data for ' + data.events[initiatedEvents])
        if (!data.errors.nullOpr) {
          data.errors.nullOpr = []
        }
        data.errors.nullOpr.push(data.events[initiatedEvents])
        return
      }
      for(let team in results.oprs) {
        if (!data.teams[team]) {
          data.teams[team] = {
            key: team,
            oprs: [],
            dprs: [],
            total_opr: 0,
            total_dpr: 0,
            avg_opr: 0,
            avg_dpr: 0,
          }
        }
        data.teams[team].oprs.push(results.oprs[team])
      }
      for(let team in results.dprs) {
        if (!data.teams[team]) {
          data.teams[team] = {
            key: team,
            oprs: [],
            dprs: [],
            total_opr: 0,
            total_dpr: 0,
            avg_opr: 0,
            avg_dpr: 0,
          }
        }
        data.teams[team].dprs.push(results.dprs[team])
      }
    },
    error: (err, textStatus) => {
      if (textStatus === 'timeout') {
        console.error('Timeout while loading data')
        if (!data.errors.oprTimeout) {
          data.errors.oprTimeout = []
        }
        data.errors.oprTimeout.push(data.events[initiatedEvents])
      } else {
        console.error('Unknown error while loading data')
        if (!data.errors.oprUnknown) {
          data.errors.oprUnknown = []
        }
        data.errors.oprUnknown.push(data.events[initiatedEvents])
      }
      
      //console.error(err)
    },
    complete: () => {
      loadedEvents++
      console.log('Loaded events: ' + loadedEvents)
      if(loadedEvents === data.events.length - 1) {
        console.log("all opr's dpr's loaded")
        saveData()
        //console.log(data)
      }
    }
  })
}

function averageOprDpr() {
  console.log(Object.keys(data.teams).length + ' teams')
  let averagedTeams = 0
  for (let team in data.teams) {
    for (let opr of data.teams[team].oprs) {
      data.teams[team].total_opr += opr
    }
    data.teams[team].avg_opr = data.teams[team].total_opr / data.teams[team].oprs.length
    for (let dpr of data.teams[team].dprs) {
      data.teams[team].total_dpr += dpr
    }
    data.teams[team].avg_dpr = data.teams[team].total_dpr / data.teams[team].dprs.length

    averagedTeams++
    console.log('Teams averaged: ' + averagedTeams)
  }
  loadMatches()
}

function loadMatches() {
  data.matches = []
  //alert('Ready?')
  initiatedEvents = 0
  loadedEvents = 0
  intervalId = setInterval(loadMatchesAjax, 500)
}

function loadMatchesAjax() {
  $.ajax({
    url: `https://www.thebluealliance.com/api/v3/event/${data.events[initiatedEvents]}/matches/simple`,
    headers: {
        "X-TBA-Auth-Key": api_key
    },
    timeout: 3000,
    beforeSend: () => {
      initiatedEvents++
      console.log('Initiated events: ' + initiatedEvents)
      //console.log('Total Events: ' + data.events.length)
      if (initiatedEvents >= data.events.length - 1) {
        console.log("all event's initiated")
        clearInterval(intervalId)
      }
    },
    success: (results) => {
      if (!results) {
        console.error('Null match data')
        if (!data.errors.nullMatch) {
          data.errors.nullMatch = []
        }
        data.errors.nullMatch.push(data.events[initiatedEvents])
      }
      for (let match of results) {
        let m = {
          red: match.alliances.red.team_keys,
          blue: match.alliances.blue.team_keys,
          winner: match.winning_alliance
        }
        data.matches.push(m)
      }
    },
    error: (err, textStatus) => {
      if (textStatus === 'timeout') {
        console.error('Timeout while loading data')
        if (!data.errors.matchTimeout) {
          data.errors.matchTimeout = []
        }
        data.errors.matchTimeout.push(data.events[initiatedEvents])
      } else {
        console.error('Unknown error while loading data')
        if (!data.errors.matchTimeout) {
          data.errors.matchTimeout = []
        }
        data.errors.matchTimeout.push(data.events[initiatedEvents])
      }
      
      //console.error(err)
    },
    complete: () => {
      loadedEvents++
      console.log('Loaded events: ' + loadedEvents)
      if(loadedEvents === data.events.length - 1) {
        console.log("all opr's dpr's loaded")
        saveData()
        //console.log(data)
      }
    }
  })
}

function generateTrainingData() {
  // Find hightest OPR and DPR
  let highestOpr = 0
  let highestDpr = 0
  for (let team in data.teams) {
    if (data.teams[team].avg_opr > highestOpr) {
      highestOpr = data.teams[team].avg_opr
    }
    if (data.teams[team].avg_dpr > highestDpr) {
      highestDpr = data.teams[team].avg_dpr
    }
  }
  data.highestOpr = highestOpr
  data.highestDpr = highestDpr
  // Generate normalized training data
  data.training_data = {
    inputs: [],
    outputs: []
  }
  let matchesCalculated = 0
  let nonVoidMatches = 0
  for (let match of data.matches) {
    if (matchesCalculated === data.matches.length) break
    let redAvgOpr = 0
    let blueAvgOpr = 0
    let redAvgDpr = 0
    let blueAvgDpr = 0
    for (let team of match.red) {
      if (!data.teams[team]) {
        console.error('Match index ' + (matchesCalculated - 1) + ' is void')
        data.matches[matchesCalculated].void = true
        matchesCalculated++
        continue
      }
      redAvgOpr += data.teams[team].avg_opr
      redAvgDpr += data.teams[team].avg_dpr
    }
    for (let team of match.blue) {
      if (!data.teams[team]) {
        console.error('Match index ' + (matchesCalculated - 1) + ' is void')
        data.matches[matchesCalculated].void = true
        matchesCalculated++
        continue
      }
      blueAvgOpr += data.teams[team].avg_opr
      blueAvgDpr += data.teams[team].avg_dpr
    }
    // Average + Normalize Input Data
    data.matches[matchesCalculated].redAvgOpr = redAvgOpr / 3 / highestOpr
    data.matches[matchesCalculated].redAvgDpr = redAvgDpr / 3 / highestDpr
    data.matches[matchesCalculated].blueAvgOpr = blueAvgOpr / 3 / highestOpr
    data.matches[matchesCalculated].blueAvgDpr = blueAvgDpr / 3 / highestDpr
    matchesCalculated++
    nonVoidMatches++
    console.log((matchesCalculated / data.matches.length * 100).toFixed(2) + '% complete')
  }
  console.log(nonVoidMatches + ' non voided matches, ' + (matchesCalculated - nonVoidMatches) + ' voided matches')
  console.log(((1 - (nonVoidMatches/matchesCalculated)) * 100).toFixed(2) + '% of matches voided')
  // Store normalized inputs
  for (let match of data.matches) {
    if (match.void) continue
    data.training_data.inputs.push([match.blueAvgOpr, match.blueAvgDpr,match.redAvgOpr,match.redAvgOpr])
    data.training_data.outputs.push(labelList.indexOf(match.winner))
  }
  console.log(data.training_data.inputs.length + ' inputs generated')
  console.log(data.training_data.outputs.length + ' outputs generated')
  saveData()
}

function splitData() {
  let training_data = data.training_data
  console.log('Training data length before: ' + training_data.inputs.length)
  let dataStop = Math.floor(training_data.inputs.length * .2)
  let randPos = Math.floor(Math.random()*(training_data.inputs.length-dataStop))
  data.testing_data = {
    inputs: training_data.inputs.splice(randPos, dataStop),
    outputs: training_data.outputs.splice(randPos, dataStop)
  }
  console.log('Training data length after: ' + training_data.inputs.length)
  console.log('Testing data length: ' + data.testing_data.inputs.length)
  saveData()
}

function trainWithData() {
  xs = tf.tensor2d(data.training_data.inputs)
  let labelsTensor = tf.tensor1d(data.training_data.outputs, 'int32')
  //labelsTensor.print()
  ys = tf.oneHot(labelsTensor, 2)

  //xs.print()
  //ys.print()

  model = tf.sequential()

  let hidden = tf.layers.dense({
    units: hidden_units,
    activation: 'sigmoid',
    inputDim: 4
  })
  let output = tf.layers.dense({
    units: 2,
    activation: 'softmax'
  })
  model.add(hidden)
  model.add(output)

  const optimizer = tf.train.sgd(lr)

  model.compile({
    optimizer: optimizer,
    loss: 'categoricalCrossentropy'
  })

  train().then(results => {
    console.log(results)
  })
}

async function train() {
  const options = {
    epochs: epochs,
    validationSplit: 0.1,
    shuffle: true,
    callbacks: {
      onTrainBegin: () => {
        console.log('training start')
        lossVals = []
      },
      onTrainEnd: () => {
        console.log('training complete')
        saveModel().then((results) => {
          console.log(results)
        })
      },
      onEpochEnd: async (num, logs) => {
        lossVals.push({
          epoch: num,
          loss: logs.val_loss
        })
        drawLoss(lossVals)
        if (!lowest_loss || logs.val_loss < lowest_loss.loss) {
          lowest_loss = {
            epoch: num,
            loss: logs.val_loss
          }
        }
        console.log('Epoch: ' + num)
        console.log('Loss: ' + logs.val_loss)
        $('#loss').text('latest loss: ' + logs.val_loss + '   |  epoch ' + lowest_loss.epoch + ' had the lowest loss of ' + lowest_loss.loss)
        await tf.nextFrame()
      }
    }
  }

  return model.fit(xs, ys, options)
}

function calculateWinPercentages() {
  let wins = {
    red: 0,
    blue: 0,
    total: 0
  }
  for (let match of data.matches) {
    if (match.void) continue
    if (match.winner === 'red') {
      wins.red++
    } else {
      wins.blue++
    }
    wins.total++
  }
  console.log('Red win percentage: ' + (wins.red / wins.total * 100))
  console.log('Blue win percentage: ' + (wins.blue / wins.total * 100))
}

function drawLoss(data) {
  
  let height = 200,
    barWidth = 20
  
  let y = d3.scaleLinear()
    .range([height, 0])
    .domain([0, d3.max(data, d => d.loss)])
  
  let chart = d3.select('.chart')
    .attr('width', barWidth * data.length)
    .attr('height', height)
  
  let bar = chart.selectAll('g')
    .data(data)
    .enter().append('g')
    .attr('transform', (d, i) => `translate(${i * barWidth},0)`)
  
  bar.append('rect')
    .attr('y', d => y(d.loss))
    .attr('height', d => height - y(d.loss))
    .attr('width', barWidth - 1)

  // bar.append('text')
  //   .attr('x', barWidth / 2)
  //   .attr('y', d => y(d.loss) + 3)
  //   .attr('dy', '.75em')
  //   .text(d => d.loss)
  // let svgWidth = 600, svgHeight = 400
  // let margin = { top: 20, right: 20, bottom: 30, left: 50 }
  // let width = svgWidth - margin.left - margin.right
  // let height = svgHeight - margin.top - margin.bottom

  // let svg = d3.select('svg')
  //   .attr('width',svgWidth)
  //   .attr('height',svgHeight)
  // let g = svg.append('g')
  //   .attr('transform',
  //     `translate(${margin.left},${margin.top})`
  //   )
  // let x = d3.scaleTime().rangeRound([0, width])
  // let y = d3.scaleLinear().rangeRound([height, 0])
  // let line = d3.line()
  //   .x(d => x(d.epoch))
  //   .y(d => y(d.loss))
  // x.domain(d3.extent(data, d => d.epoch))
  // y.domain(d3.extent(data, d => d.loss))
  // g.append('g')
  //   .attr('transform', `translate(0,${height})`)
  //   .call(d3.axisBottom(x))
  //   .select('.domain')
  //   .remove()
  // g.append('g')
  //   .call(d3.axisLeft(y))
  //   .append('text')
  //   .attr('fill', '#000')
  //   .attr('transform', 'rotate(-90)')
  //   .attr('y', 6)
  //   .attr('dy', '0.71em')
  //   .attr('text-anchor', 'end')
  //   .text('Loss (%)')
  // g.append('path')
  //   .datum(lossVals)
  //   .attr('fill', 'none')
  //   .attr('stroke', 'steelblue')
  //   .attr('stroke-linejoin', 'round')
  //   .attr('stroke-linecap', 'round')
  //   .attr('stroke-width', 1.5)
  //   .attr('d', line)
}

function returnAverages(alliance) {
  let avgOprs = 0
  let avgDprs = 0
  for (let team of alliance) {
    if (!data.teams[team]) {
      errorText.html('One of the teams was incorrectly entered')
      return undefined
    }
    avgOprs += data.teams[team].avg_opr
    avgDprs += data.teams[team].avg_dpr
  }
  return [avgOprs, avgDprs]
}

function predict() {
  let match_num = matchNum.value()
  let event_key = eventCode.value()
  let match_type = matchType.value()
  if (!match_num || event_key === '') {
    errorText.html('Input Error')
    return
  }
  $.ajax({
    url: `https://www.thebluealliance.com/api/v3/match/${event_key+"_"+match_type+match_num}`,
    headers: {
        "X-TBA-Auth-Key": api_key
    },
    success: (results) => {
      errorText.html('')
      let redAlliance = results.alliances.red.team_keys
      let blueAlliance = results.alliances.blue.team_keys
      
      tf.tidy(() => {
        let x = tf.tensor2d([
          [returnAverages(blueAlliance)[0], returnAverages(blueAlliance)[1], returnAverages(redAlliance)[0], returnAverages(redAlliance)[1]]
        ])
        x.print()

        let results = model.predict(x).dataSync()
        console.log(results)
        //let index = results.argMax(1).dataSync()[0]
        //let label = labelList[index]
        predictP.html((results[0] * 100).toFixed(2) + '% blue win / ' + (results[1] * 100).toFixed(2) + '% red win')
      })
    },
    error: (err) => {
        console.log('Error loading data')
        console.error(err)
    }
  })
}

function testModelWithData() {
  console.log('loading model...')
  let url = `http://localhost:8080/models/${hidden_units}_hidden_units_${epochs}_epochs_${lr*100}_lr.json`
  loadModel(url)
}

async function saveModel() {
  return await model.save(`downloads://${hidden_units}_hidden_units_${epochs}_epochs_${lr*100}_lr`)
}

async function loadModel(url) {
  model = await tf.loadModel(url)
}