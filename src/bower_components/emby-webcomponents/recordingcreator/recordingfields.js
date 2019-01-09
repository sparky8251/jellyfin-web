define(["globalize", "connectionManager", "serverNotifications", "require", "loading", "apphost", "dom", "recordingHelper", "events", "registrationServices", "paper-icon-button-light", "emby-button", "css!./recordingfields", "flexStyles"], function(globalize, connectionManager, serverNotifications, require, loading, appHost, dom, recordingHelper, events, registrationServices) {
    "use strict";

    function getRegistration(apiClient, feature) {
        return registrationServices.validateFeature(feature, {
            showDialog: !1,
            viewOnly: !0
        })
    }

    function showConvertRecordingsUnlockMessage(context, apiClient) {
        getRegistration(apiClient, getDvrFeatureCode()).then(function() {
            context.querySelector(".convertRecordingsContainer").classList.add("hide")
        }, function() {
            context.querySelector(".convertRecordingsContainer").classList.remove("hide")
        })
    }

    function showSeriesRecordingFields(context, programId, apiClient) {
        getRegistration(apiClient, getDvrFeatureCode()).then(function() {
            context.querySelector(".supporterContainer").classList.add("hide"), context.querySelector(".convertRecordingsContainer").classList.add("hide"), context.querySelector(".recordSeriesContainer").classList.remove("hide")
        }, function() {
            context.querySelector(".supporterContainerText").innerHTML = globalize.translate("sharedcomponents#MessageActiveSubscriptionRequiredSeriesRecordings"), context.querySelector(".supporterContainer").classList.remove("hide"), context.querySelector(".recordSeriesContainer").classList.add("hide"), context.querySelector(".convertRecordingsContainer").classList.add("hide")
        })
    }

    function getDvrFeatureCode() {
        return "dvr"
    }

    function showSingleRecordingFields(context, programId, apiClient) {
        getRegistration(apiClient, getDvrFeatureCode()).then(function() {
            context.querySelector(".supporterContainer").classList.add("hide"), showConvertRecordingsUnlockMessage(context, apiClient)
        }, function() {
            context.querySelector(".supporterContainerText").innerHTML = globalize.translate("sharedcomponents#DvrSubscriptionRequired"), context.querySelector(".supporterContainer").classList.remove("hide"), context.querySelector(".convertRecordingsContainer").classList.add("hide")
        })
    }

    function showRecordingFieldsContainer(context, programId, apiClient) {
        getRegistration(apiClient, getDvrFeatureCode()).then(function() {
            context.querySelector(".recordingFields").classList.remove("hide")
        }, function() {
            context.querySelector(".recordingFields").classList.add("hide")
        })
    }

    function loadData(parent, program, apiClient) {
        program.IsSeries ? (parent.querySelector(".recordSeriesContainer").classList.remove("hide"), showSeriesRecordingFields(parent, program.Id, apiClient)) : (parent.querySelector(".recordSeriesContainer").classList.add("hide"), showSingleRecordingFields(parent, program.Id, apiClient)), program.SeriesTimerId ? (parent.querySelector(".btnManageSeriesRecording").classList.remove("hide"), parent.querySelector(".seriesRecordingButton .recordingIcon").classList.add("recordingIcon-active"), parent.querySelector(".seriesRecordingButton .buttonText").innerHTML = globalize.translate("sharedcomponents#CancelSeries")) : (parent.querySelector(".btnManageSeriesRecording").classList.add("hide"), parent.querySelector(".seriesRecordingButton .recordingIcon").classList.remove("recordingIcon-active"), parent.querySelector(".seriesRecordingButton .buttonText").innerHTML = globalize.translate("sharedcomponents#RecordSeries")), program.TimerId && "Cancelled" !== program.Status ? (parent.querySelector(".btnManageRecording").classList.remove("hide"), parent.querySelector(".singleRecordingButton .recordingIcon").classList.add("recordingIcon-active"), "InProgress" === program.Status ? parent.querySelector(".singleRecordingButton .buttonText").innerHTML = globalize.translate("sharedcomponents#StopRecording") : parent.querySelector(".singleRecordingButton .buttonText").innerHTML = globalize.translate("sharedcomponents#DoNotRecord")) : (parent.querySelector(".btnManageRecording").classList.add("hide"), parent.querySelector(".singleRecordingButton .recordingIcon").classList.remove("recordingIcon-active"), parent.querySelector(".singleRecordingButton .buttonText").innerHTML = globalize.translate("sharedcomponents#Record"))
    }

    function fetchData(instance) {
        var options = instance.options,
            apiClient = connectionManager.getApiClient(options.serverId);
        return showRecordingFieldsContainer(options.parent, options.programId, apiClient), apiClient.getLiveTvProgram(options.programId, apiClient.getCurrentUserId()).then(function(program) {
            instance.TimerId = program.TimerId, instance.Status = program.Status, instance.SeriesTimerId = program.SeriesTimerId, loadData(options.parent, program, apiClient)
        })
    }

    function onTimerChangedExternally(e, apiClient, data) {
        var options = this.options,
            refresh = !1;
        data.Id && this.TimerId === data.Id && (refresh = !0), data.ProgramId && options && options.programId === data.ProgramId && (refresh = !0), refresh && this.refresh()
    }

    function onSeriesTimerChangedExternally(e, apiClient, data) {
        var options = this.options,
            refresh = !1;
        data.Id && this.SeriesTimerId === data.Id && (refresh = !0), data.ProgramId && options && options.programId === data.ProgramId && (refresh = !0), refresh && this.refresh()
    }

    function RecordingEditor(options) {
        this.options = options, this.embed();
        var timerChangedHandler = onTimerChangedExternally.bind(this);
        this.timerChangedHandler = timerChangedHandler, events.on(serverNotifications, "TimerCreated", timerChangedHandler), events.on(serverNotifications, "TimerCancelled", timerChangedHandler);
        var seriesTimerChangedHandler = onSeriesTimerChangedExternally.bind(this);
        this.seriesTimerChangedHandler = seriesTimerChangedHandler, events.on(serverNotifications, "SeriesTimerCreated", seriesTimerChangedHandler), events.on(serverNotifications, "SeriesTimerCancelled", seriesTimerChangedHandler)
    }

    function onSupporterButtonClick() {
        registrationServices.showPremiereInfo()
    }

    function onManageRecordingClick(e) {
        var options = this.options;
        if (this.TimerId && "Cancelled" !== this.Status) {
            var self = this;
            require(["recordingEditor"], function(recordingEditor) {
                recordingEditor.show(self.TimerId, options.serverId, {
                    enableCancel: !1
                }).then(function() {
                    self.changed = !0
                })
            })
        }
    }

    function onManageSeriesRecordingClick(e) {
        var options = this.options;
        if (this.SeriesTimerId) {
            var self = this;
            require(["seriesRecordingEditor"], function(seriesRecordingEditor) {
                seriesRecordingEditor.show(self.SeriesTimerId, options.serverId, {
                    enableCancel: !1
                }).then(function() {
                    self.changed = !0
                })
            })
        }
    }

    function onRecordChange(e) {
        this.changed = !0;
        var self = this,
            options = this.options,
            apiClient = connectionManager.getApiClient(options.serverId),
            button = dom.parentWithTag(e.target, "BUTTON"),
            isChecked = !button.querySelector("i").classList.contains("recordingIcon-active"),
            hasEnabledTimer = this.TimerId && "Cancelled" !== this.Status;
        isChecked ? hasEnabledTimer || (loading.show(), recordingHelper.createRecording(apiClient, options.programId, !1).then(function() {
            events.trigger(self, "recordingchanged"), fetchData(self), loading.hide()
        })) : hasEnabledTimer && (loading.show(), recordingHelper.cancelTimer(apiClient, this.TimerId, !0).then(function() {
            events.trigger(self, "recordingchanged"), fetchData(self), loading.hide()
        }))
    }

    function sendToast(msg) {
        require(["toast"], function(toast) {
            toast(msg)
        })
    }

    function onRecordSeriesChange(e) {
        this.changed = !0;
        var self = this,
            options = this.options,
            apiClient = connectionManager.getApiClient(options.serverId);
        if (dom.parentWithTag(e.target, "BUTTON").querySelector("i").classList.contains("recordingIcon-active")) showSingleRecordingFields(options.parent, options.programId, apiClient), this.SeriesTimerId && apiClient.cancelLiveTvSeriesTimer(this.SeriesTimerId).then(function() {
            sendToast(globalize.translate("sharedcomponents#RecordingCancelled")), fetchData(self)
        });
        else if (showSeriesRecordingFields(options.parent, options.programId, apiClient), !this.SeriesTimerId) {
            var promise = this.TimerId ? recordingHelper.changeRecordingToSeries(apiClient, this.TimerId, options.programId) : recordingHelper.createRecording(apiClient, options.programId, !0);
            promise.then(function() {
                fetchData(self)
            })
        }
    }
    return RecordingEditor.prototype.embed = function() {
        var self = this;
        return new Promise(function(resolve, reject) {
            require(["text!./recordingfields.template.html"], function(template) {
                var options = self.options,
                    context = options.parent;
                context.innerHTML = globalize.translateDocument(template, "sharedcomponents");
                for (var supporterButtons = context.querySelectorAll(".btnSupporter"), i = 0, length = supporterButtons.length; i < length; i++) supporterButtons[i].addEventListener("click", onSupporterButtonClick);
                context.querySelector(".singleRecordingButton").addEventListener("click", onRecordChange.bind(self)), context.querySelector(".seriesRecordingButton").addEventListener("click", onRecordSeriesChange.bind(self)), context.querySelector(".btnManageRecording").addEventListener("click", onManageRecordingClick.bind(self)), context.querySelector(".btnManageSeriesRecording").addEventListener("click", onManageSeriesRecordingClick.bind(self)), fetchData(self).then(resolve)
            })
        })
    }, RecordingEditor.prototype.hasChanged = function() {
        return this.changed
    }, RecordingEditor.prototype.refresh = function() {
        fetchData(this)
    }, RecordingEditor.prototype.destroy = function() {
        var timerChangedHandler = this.timerChangedHandler;
        this.timerChangedHandler = null, events.off(serverNotifications, "TimerCreated", timerChangedHandler), events.off(serverNotifications, "TimerCancelled", timerChangedHandler);
        var seriesTimerChangedHandler = this.seriesTimerChangedHandler;
        this.seriesTimerChangedHandler = null, events.off(serverNotifications, "SeriesTimerCreated", seriesTimerChangedHandler), events.off(serverNotifications, "SeriesTimerCancelled", seriesTimerChangedHandler)
    }, RecordingEditor
});