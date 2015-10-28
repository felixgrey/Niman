/**
 * 已有模块的整合优化
 */
;
(function(_window) {

	function joinNEventsNViewModel(NEvents, NViewModel) {
		NViewModel.prototype._observeElement = function(_element, type, callback) {
			NEvents.listen(_element).on(type, _element, callback);
		};
		NViewModel.prototype._stopObserveElement = function(_element, type, callback) {
			NEvents.listen(_element).un(type, _element, callback);
		};
	};

	function joinNEventsNDomQuery(NEvents, NDomQuery) {
		NDomQuery.prototype._observeElement = function(_element, type, callback) {
			NEvents.listen(_element).on(type, _element, callback);
		};
		NDomQuery.prototype._stopObserveElement = function(_element, type, callback) {
			NEvents.listen(_element).un(type, _element, callback);
		};
	};

	var PromiseNAjaxJoined = false;

	function joinPromiseNAjax(NAjax) {
		if (PromiseNAjaxJoined || !Promise || !NAjax || NAjax.hasPromise) {
			return;
		}
		PromiseNAjaxJoined = true;
		NAjax.setPromise(Promise);
	};

	var PromiseEmitterJoined = false;

	function joinPromiseEmitter(NUtils) {
		if (PromiseEmitterJoined || !Promise || !NUtils || NUtils.Emitter.prototype.call) {
			return;
		}
		PromiseEmitterJoined = true;
		NUtils.Emitter.setPromise(Promise);
	};

	var factory = function(o) {
		var NViewModel = o.NViewModel,

			NPromise = o.NPromise,
			NEvents = o.NEvents,
			NDomQuery = o.NDomQuery,
			Sizzle = o.Sizzle,
			NUtils = o.NUtils,
			//			NRouter = o.NRouter,		
			//			NBezier = o.NBezier,
			//			Dragger = o.Dragger,
			//			Gesture = o.Gesture,
			NAjax = o.NAjax;

		var reObj = {};

		if (NEvents && NViewModel) {
			joinNEventsNViewModel(NEvents, NViewModel);
		}

		if (NEvents && NDomQuery) {
			joinNEventsNDomQuery(NEvents, NDomQuery);
		}

		if (Sizzle && NDomQuery) {
			NDomQuery.setSizzle(Sizzle);
		}

		if (NAjax && (Promise || NPromise)) {
			joinPromiseNAjax(NAjax);
		}

		if (NUtils && (Promise || NPromise)) {
			joinPromiseEmitter(NUtils);
		}

		return reObj;
	};
	//-----------------------------------------模块-----------------------------------------//
	if (Niman && Niman.plugin && Niman.define) {
		Niman.plugin('NCombinationPlugin', ['supports', 'definition', 'application'], function(info) {
			var modules = ['NViewModel', 'NPromise', 'NEvents', 'NDomQuery',
				'NAjax', 'Sizzle', 'NUtils' //, 'NRouter',  'Dragger', 'Gesture'
			];

			var moduleDefineStates = {};
			var _name;
			for (var i = 0; i < modules.length; i++) {
				_name = modules[i];
				moduleDefineStates[_name] = info.moduleFactory.getModule(_name).defineState;
			}

			var StateAction = info.StateAction;
			var context = info.context;

			new StateAction().all([moduleDefineStates['NEvents'], moduleDefineStates['NViewModel']]).ok(function() {
				Niman.use('NEvents', function() {
					Niman.use('NViewModel', function() {
						joinNEventsNViewModel(context.NEvents, context.NViewModel);
					});
				});
			});

			new StateAction().all([moduleDefineStates['NEvents'], moduleDefineStates['NDomQuery']]).ok(function() {
				Niman.use('NEvents', function() {
					Niman.use('NDomQuery', function() {
						joinNEventsNViewModel(context.NEvents, context.NDomQuery);
					});
				});
			});

			new StateAction().all([moduleDefineStates['NDomQuery'], moduleDefineStates['Sizzle']]).ok(function() {
				Niman.use('NDomQuery', function() {
					Niman.use('Sizzle', function() {
						context.NDomQuery.setSizzle(context.Sizzle);
					});
				});
			});

			moduleDefineStates['NAjax'].ok(function() {
				Niman.use('NAjax', function() {
					joinPromiseNAjax(context.NAjax);
				});
			});

			moduleDefineStates['NUtils'].ok(function() {
				Niman.use('NUtils', function() {
					joinPromiseEmitter(context.NUtils);
				});
			});

			moduleDefineStates['NPromise'].ok(function() {
				Niman.use('NPromise', function() {
					joinPromiseNAjax(context.NAjax);
					joinPromiseEmitter(context.NUtils);
				});
			});

		});
	} else if (typeof define === 'function') {
		//CommonJS
		define(function(require, _exports, module) {
			module.exports = factory;
		});
	} else {
		factory({
			NViewModel: _window.NimanViewModel,
			NPromise: _window.NimanPromise,
			NEvents: _window.NimanEvents,
			NDomQuery: _window.NimanDomQuery,
			Sizzle: _window.Sizzle,
			NUtils: _window.NimanUtils,
			//			NRouter: _window.NimanRouter,
			//			NBezier: _window.NimanBezier,
			//			Dragger: _window.NimanDragger,
			//			Gestrue: _window.NimanGestrue,
			NAjax: _window.NimanAjax
		});
	}
})(this);