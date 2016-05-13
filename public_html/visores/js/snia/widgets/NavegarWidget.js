/*
 * js/snia/widgets/NavegarWidget
 * 
 */
/*global define, console*/
/*jslint nomen: true */
define([
    "dojo/on",
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/a11yclick",
    "dojo/text!./templates/NavegarWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "esri/toolbars/draw",
    "esri/graphic",
    "modulos/Dibujo",
    "modulos/Grafico3SR",
    "dijit/form/ToggleButton",
    "dijit/form/Button"
], function (on, Evented, declare, lang, arrayUtil,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick,
    template, i18n, domClass, domStyle,
    Draw, Graphic,
    Dibujo, Grafico3SR) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            active: false
        },
        constructor: function (options, srcRefNode) {
            //mezclar opciones usuario y default
            var defaults = lang.mixin({}, this.options, options);
            //nodo del widget
            this.domNode = srcRefNode;
            this._i18n = i18n;
            this._botones = [];
            //propiedades
            this.set("mapa", defaults.mapa);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            this.set("extensionesAnteriores", []);
            this.set("extensionesPosteriores", []);
            this.set("_esAnteriorOPosterior", false);
            this.set("active", defaults.active);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._active);
            this.watch("dibujoEnable", this._dibujoEnabledChanged);
            // classes
            this._css = { };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this._botones = [this._acercarNode, this._alejarNode, this._desplazarNode,
                    this._extensionMaximaNode, this._extensionAnteriorNode, this._extensionPosteriorNode];
                this._mapExtentChangeListener = on(this.mapa.map, "extent-change", lang.hitch(this, this._mapExtentChange));
                this.own(
                    on(this._acercarNode, a11yclick, lang.hitch(this, this._acercarClick)),
                    on(this._alejarNode, a11yclick, lang.hitch(this, this._alejarClick)),
                    on(this._desplazarNode, a11yclick, lang.hitch(this, this._desplazarClick)),
                    on(this._extensionMaximaNode, a11yclick, lang.hitch(this, this._extensionMaximaClick)),
                    on(this._extensionAnteriorNode, a11yclick, lang.hitch(this, this._extensionAnteriorClick)),
                    on(this._extensionPosteriorNode, a11yclick, lang.hitch(this, this._extensionPosteriorClick))
                );
            }
        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('NavegarWidget::requiere un mapa');
            }
            //  mapa cargado
            if (this.mapa.loaded) {
                this._init();
            } else {
                on.once(this.mapa, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },
        // connections/subscriptions se limpian durante la fase destroy()
        destroy: function () {
            this.inherited(arguments);
        },
        /* ---------------- */
        /* Eventos Publicos */
        /* ---------------- */
        // load
        /* ---------------- */
        /* Funciones publicas */
        /* ---------------- */
        show: function () {
            this.set("visible", true);
        },
        hide: function () {
            this.set("visible", false);
        },
        /* ---------------- */
        /* Funciones Privadas */
        /* ---------------- */
        _visible: function () {
            if (this.get("visible")) {
                domStyle.set(this.domNode, 'display', 'block');
            } else {
                domStyle.set(this.domNode, 'display', 'none');
            }
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _dibujoEnabledChanged: function () {
            this.emit("dibujo-enabled-changed", {});
        },
        _init: function () {
            this._initDibujo();
            this._visible();
            this.set("loaded", true);
            this.emit("load", {});
            var g, g3sr;
            g = new Graphic(this.mapa.map.extent);
            g3sr = new Grafico3SR(g);
            this.set("_ultExtent", g3sr);
            this._active();
        },
        _initDibujo: function () {
            this._dibujo = new Dibujo();
            this._dibujo.agregarMapa(this.mapa);
            on(this._dibujo, "dibujo-complete", lang.hitch(this, this._dibujoComplete));
        },
        _acercarClick : function () {
            this._dibujo.activar(Draw.EXTENT);
            this._alejarNode.set('checked', false);
            if (this._acercarNode.checked) {
                this._desplazarNode.set('checked', false);
            } else {
                this._desplazarNode.set('checked', true);
            }
        },
        _alejarClick : function () {
            this._dibujo.activar(Draw.EXTENT);
            this._acercarNode.set('checked', false);
            if (this._alejarNode.checked) {
                this._desplazarNode.set('checked', false);
            } else {
                this._desplazarNode.set('checked', true);
            }
        },
        _desplazarClick : function () {
            if (this._alejarNode.checked || this._acercarNode.checked){
                this._dibujo.desactivar();
                this._alejarNode.set('checked', false);
                this._acercarNode.set('checked', false);
            }
            this._desplazarNode.set('checked', true);
        },
        _extensionMaximaClick : function () {
            var scale = this.mapa.map.getMinScale();
            this.mapa.map.setScale(scale);
        },
        _extensionAnteriorClick : function () {
            if (this.extensionesAnteriores.length > 0) {
                this.extensionesPosteriores.push(this._ultExtent);
                this._extensionPosteriorNode.setAttribute('disabled', false);
                this._ultExtent = this.extensionesAnteriores.pop();
                var g = this._ultExtent.grafico(this.mapa.map.spatialReference.wkid);
                this.mapa.map.setExtent(g.geometry);
                if (this.extensionesAnteriores.length === 0) {
                    this._extensionAnteriorNode.setAttribute('disabled', true);
                }
                this._esAnteriorOPosterior = true;
            }
        },
        _extensionPosteriorClick : function () {
            if (this.extensionesPosteriores.length > 0) {
                this.extensionesAnteriores.push(this._ultExtent);
                this._extensionAnteriorNode.setAttribute('disabled', false);
                this._ultExtent = this.extensionesPosteriores.pop();
                var g = this._ultExtent.grafico(this.mapa.map.spatialReference.wkid);
                this.mapa.map.setExtent(g.geometry);
                if (this.extensionesPosteriores.length === 0) {
                    this._extensionPosteriorNode.setAttribute('disabled', true);
                }
                this._esAnteriorOPosterior = true;
            }
        },
        _dibujoComplete: function (evt) {
            if (this._acercarNode.get('checked')) {
                //acercar
                this.mapa.map.setExtent(evt.geometry);
            } else {
                //alejar
                this.mapa.map.setExtent(this.mapa.map.extent.expand(2));
            }
        },
        _mapExtentChange: function (evt) {
            //Manejador para cambios de extent
            if (!this._esAnteriorOPosterior) {
                //Cambios NO generado por botones Anterior o Posterior
                this.extensionesAnteriores.push(this._ultExtent);
                var g, g3sr;
                g = new Graphic(this.mapa.map.extent);
                g3sr = new Grafico3SR(g);
                this._ultExtent = g3sr;
                this.set("extensionesPosteriores", []);
                this._extensionAnteriorNode.setAttribute('disabled', false);
                this._extensionPosteriorNode.setAttribute('disabled', true);
            } else {
                //Cambios generados por botones Anterior o Posterior
                this._esAnteriorOPosterior = false;
            }
        },
        _active: function () {
            if (this.get("active")) {
                arrayUtil.forEach(this._botones, function (boton) {
                    boton.set('disabled', false);
                });
                this._alejarNode.set('checked', false);
                this._acercarNode.set('checked', false);
                this._desplazarNode.set('checked', true);
            } else {
                if (this._alejarNode.checked || this._acercarNode.checked){
                    this._dibujo.desactivar();
                }
                arrayUtil.forEach(this._botones, function (boton) {
                    boton.set('disabled', true);
                });
            }
            this.emit("active-changed", {});
        }
    });
    return widget;
});
