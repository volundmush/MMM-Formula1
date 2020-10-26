/* Magic Mirror
 * Module: MMM-Formula1
 *
 * By Ian Perrin http://github.com/ianperrin/MMM-Formula1
 * MIT Licensed.
 */

/* global Module, Log */

Module.register("MMM-Formula1",{

    // Default module config.
    defaults: {
        season: "current",
        type: "DRIVER",
        maxRows: false,
        calendar: false,
        fade: true,
        fadePoint: 0.3,
        reloadInterval: 30 * 60 * 1000,       // every 30 minutes
        animationSpeed: 2.5 * 1000,           // 2.5 seconds
        grayscale: true,
        showFooter: true,
    },

    // Store the Ergast data in an object.
    ergastData: {DRIVER: null, CONSTRUCTOR: null},

    // A loading boolean.
    loading: true,

    // Subclass getStyles method.
    getStyles: function() {
        return ["font-awesome.css","MMM-Formula1.css"];
    },

    // Subclass getTranslations method.
    getTranslations: function() {
        return {
            en: "translations/en.json",
            nl: "translations/nl.json",
            de: "translations/de.json",
            id: "translations/id.json",
            sv: "translations/sv.json"
        };
    },

	// this is called when files are loaded
	ready: function(obj) {
    	obj.loaded_files = obj.loaded_files+1;
    	if(obj.loaded_files === 2) {
			obj.sendSocketNotification("CONFIG", obj.config);
			obj.launched = true;
		}
	},

    // Subclass start method.
    start: function() {
        Log.info("Starting module: " + this.name);
        // Validate config options
        this.validateConfig();
        // Add custom filters
        this.addFilters();
        // Load nationalities & start polling
        var self = this;
        this.loaded_files = 0;
        this.launched = false;
        this.getJson(function(response) {
            // Parse JSON string into object
            self.nationalities = JSON.parse(response);
            self.nation_map = {};
			for(var i = 0, len = self.nationalities.length; i < len; i++) {
				self.nation_map[self.nationalities[i].demonym] = self.nationalities[i];
			}
            // Start helper and data polling
            self.ready(self);
        }, "nationalities.json");
        this.getJson(function(response) {
			self.constructors = JSON.parse(response);
			self.con_map = {};
			for(var i = 0, len = self.constructors.length; i < len; i++) {
				self.con_map[self.constructors[i].name] = self.constructors[i];
			}
			// Start helper and data polling
			self.ready(self);
		}, "constructors.json");
    },
    // Subclass socketNotificationReceived method.
    socketNotificationReceived: function(notification, payload) {
        Log.info(this.name + " received a notification: " + notification);
        if (notification === "DRIVER_STANDINGS") {
            this.ergastData.DRIVER = payload.MRData;
            this.loading = false;
            this.updateDom(this.config.animationSpeed);
        } else if(notification === "CONSTRUCTOR_STANDINGS"){
            this.ergastData.CONSTRUCTOR = payload.MRData;
            this.loading = false;
            this.updateDom(this.config.animationSpeed);
        }
    },
    getTemplate: function () {
        return "templates\\mmm-formula1-standings.njk";
    },
    getTemplateData: function () {
        var templateData = {
            loading: this.loading,
            config: this.config,
            standings: null,
            identifier: this.identifier,
            timeStamp: this.dataRefreshTimeStamp
        };
        if (!this.loading && this.ergastData && this.ergastData[this.config.type].StandingsTable.StandingsLists.length > 0) {
            var standingsLists = this.ergastData[this.config.type].StandingsTable.StandingsLists[0];
            templateData.standings = this.config.type === "DRIVER" ? standingsLists.DriverStandings : standingsLists.ConstructorStandings;
            templateData.season = standingsLists.season;
            templateData.round = standingsLists.round;
            if(this.config.maxRows) {
                templateData.standings = templateData.standings.slice(0, this.config.maxRows);
            }
        }
        console.log(templateData);
        return templateData;
    },
    validateConfig: function() {
        // Validate module type
        var validTypes = ["DRIVER","CONSTRUCTOR"];
        if (validTypes.indexOf(this.config.type.toUpperCase()) == -1) {
            this.config.type = "DRIVER";
        }
    },
    addFilters() {
        var env = this.nunjucksEnvironment();
        env.addFilter("getCodeFromNationality", this.getCodeFromNationality.bind(this));
		env.addFilter("getCodeFromConstructors", this.getCodeFromConstructors.bind(this));
        env.addFilter("getFadeOpacity", this.getFadeOpacity.bind(this));
    },
    getFadeOpacity: function(index, itemCount) {
        var fadeStart = itemCount * this.config.fadePoint;
        var fadeItemCount = itemCount - fadeStart + 1;
        if (this.config.fade && index > fadeStart) {
            return 1- ((index - fadeStart) / fadeItemCount);
        } else {
            return 1;
        }
    },
    getCodeFromNationality: function(nationality) {
        var results = this.nation_map[nationality];
    	if(results) {
        	return results.code.toLowerCase();
		}
        return "";
    },
	getCodeFromConstructors: function(con) {
		var results = this.con_map[con];
		if(results) {
			return results.code.toLowerCase();
		}
		return "";
	},
    getJson(callback, filename) {
        var xobj = new XMLHttpRequest();
        var path = this.file(filename);
        xobj.overrideMimeType("application/json");
        xobj.open("GET", path, true);
        xobj.onreadystatechange = function() {
            if (xobj.readyState === 4 && xobj.status === 200) {
                callback(xobj.responseText);
            }
        };
        xobj.send(null);
    }
});
