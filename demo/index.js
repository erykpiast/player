var $ = require('jquery');
var Director = require('director');

var ProgressiveBasicExperiment = require('./experiments/progressive-basic');
var ProgressiveTweensExperiment = require('./experiments/progressive-tweens');
var StreamingTweensExperiment = require('./experiments/streaming-tweens');
var TweenPlaygroundExperiment = require('./experiments/tween-playground');
var StressTestExperiment = require('./experiments/stress-test');

var experimentTitleContainer;
var experimentView;
var currentExperiment;
function loadExperiment(path, experiment) {
    return function() {
        if(currentExperiment && (currentExperiment !== experiment)) {
            currentExperiment.unload();
        }

        currentExperiment = experiment;

        experiment.load();

        experimentTitleContainer.innerHTML = document.querySelector('a[href="#' + path + '"]').innerHTML;
        experimentView.className = 'experiment experiment--' + path.slice(1);
    };
}


$(function() {
    experimentView = document.querySelector('body > .experiment');
    experimentTitleContainer = experimentView.querySelector('.experiment__title');

    var progressiveBasicExperiment = new ProgressiveBasicExperiment(experimentView);
    var progressiveTweensExperiment = new ProgressiveTweensExperiment(experimentView);
    var streamingTweensExperiment = new StreamingTweensExperiment(experimentView);
    var tweenPlaygroundExperiment = new TweenPlaygroundExperiment(experimentView);
    var stressTestExperiment = new StressTestExperiment(experimentView);

    new Director.Router({
        '/progressive-basic': loadExperiment('/progressive-basic', progressiveBasicExperiment),
        '/progressive-tweens': loadExperiment('/progressive-tweens', progressiveTweensExperiment),
        '/streaming-tweens': loadExperiment('/streaming-tweens', streamingTweensExperiment),
        '/tween-playground': loadExperiment('/tween-playground', tweenPlaygroundExperiment),
        '/stress-test': loadExperiment('/stress-test', stressTestExperiment)
    }).init();
});