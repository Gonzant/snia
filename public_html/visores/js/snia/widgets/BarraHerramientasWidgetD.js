/*
 * js/snia/widgets/BarraHerramientasWidgetD
 * 
 */
/*global define, console*/
/*jslint nomen: true */
define([
    "dojo/dom-construct",
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/BarraHerramientasWidgetD.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "widgets/BotonHerramientaWidgetD"
], function (domConstruct, Evented, declare, lang, arrayUtil,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle,
    BotonHerramientaWidgetD
    ) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        options : {
            theme: "sitWidget",
            herramientasOptions: null,
            vertical: true,
            visible: true,
            active: true
        },
        _botones: null,
        constructor: function (options, srcRefNode) {
            //mezclar opciones usuario y default
            var defaults = lang.mixin({}, this.options, options);
            //nodo del widget
            this.domNode = srcRefNode;
            this._i18n = i18n;
            this._botones = [];
            //propiedades
            this.set("herramientasOptions", defaults.herramientasOptions);
            this.set("vertical", defaults.vertical);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            this.set("active", defaults.active);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._active);
            // classes
            this._css = { };
        },
        postCreate: function () {
            this.inherited(arguments);
        },
        // inicio widget. invocado por el usuario
        startup: function () {
            this._init();
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
        activar: function () {
            this.set("active", true);
        },
        desactivar: function () {
            this.set("active", false);
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
        _active: function () {
            if (this.get("active")) {
                arrayUtil.forEach(this._botones, function (boton) {
                    boton.activar();
                });
            } else {
                arrayUtil.forEach(this._botones, function (boton) {
                    boton.desactivar();
                });
            }
        },
        _initBotonHerramienta: function (herramientaOptions) {
            var tipo, node, node2, boton;
            tipo = this.get('vertical') ? '<div></div>' : '<div> <td width=10px> </div>';
            node = domConstruct.toDom(tipo);
            node2 = domConstruct.place('<div></div>', node);
            domConstruct.place(node, this._rootNode);
            boton = new BotonHerramientaWidgetD(herramientaOptions, node2);
            boton.startup();
            this._botones.push(boton);

        },
        _init: function () {
            this._visible();
            //creo los botones de las herramientas
            arrayUtil.forEach(this.herramientasOptions, lang.hitch(this, this._initBotonHerramienta));
            //fin
            this.set("loaded", true);
            this.emit("load", {});
        }
    });
    return widget;
});
