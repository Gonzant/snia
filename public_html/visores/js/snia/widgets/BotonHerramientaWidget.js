/*
 * js/snia/widgets/BotonHerramientaWidget
 * 
 */
/*global define, console*/
/*jslint nomen: true */
define([
    "dojo/on",
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/a11yclick",
    "dojo/text!./templates/BotonHerramientaWidget.html",
    "dojo/text!./templates/estilo2017/botonHerramientaWidget.html",
    "dojo/i18n!../js/snia/nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "dijit/Tooltip"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick,
    template, newTemplate, i18n, domClass, domStyle, Tooltip) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        options : {
            theme: "sitWidget",
            herramienta: null,
            visible: true,
            active: true,
            mapa : null,
            icono: 'xxx',
            icon: '',
            etiqueta: 'xxx', //nombre boton,
            msgToolTip: 'xxx'
        },
        constructor: function (options, srcRefNode, estilo, mapa) {
            //mezclar opciones usuario y default
            var defaults = lang.mixin({}, this.options, options);
            //nodo del widget
            this.domNode = srcRefNode;
            this._i18n = i18n;
            this._etiqueta = defaults.etiqueta;
            this._icono = defaults.icono;
            this._icon = defaults.icon;
            this._msgToolTip = defaults.msgToolTip;
            //propiedades
            this.set("herramienta", defaults.herramienta);
            this.set("theme", defaults.theme);
            this.set("mapa", mapa);
            this.set("visible", defaults.visible);
            this.set("estilo", estilo);
            this.set("active", defaults.active);
            if (this.estilo) {
                this.set("templateString", newTemplate);
            }

            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._active);                        
            // classes
            this._css = { };
        },
        postCreate: function () {
            this.inherited(arguments);
            this.own(
                on(this._botonNode, a11yclick, lang.hitch(this, this._bBotonClick))
            );
        },
        // inicio widget. invocado por el usuario
        startup: function () {
            // widget no definido
            if (!this.herramienta) {
                this.destroy();
                console.log('BotonHerramienta::requiere una herramienta');
            }
            // widget no compatible
            if (this.herramienta.execute === undefined ||
                    this.herramienta.canExecute === undefined) {
                this.destroy();
                console.log('BotonHerramienta::herramienta requiere propiedad execute y canExecute');
            }
            if (!this.get("loaded")) {
                this._init();
            }
            if (this.estilo) {
                this._botonNode.innerHTML = "<a class=\"itemMainMenu\" href=\"#\"><i class=\"material-icons\">" + this._icon + "</i></a>";
                new Tooltip({
                    connectId: [this._botonNode],
                    position: ['below'],
                    label: "<b>" + this._etiqueta + "</b>" + "<p> " + this._msgToolTip + "</p>"
                });
            } else {
                this._botonNode.innerHTML = "<img src=" + '"' + this._icono + '"' + "class=" + '"' + "estiloBotonBarra" + '"' + "> <br>";
                new Tooltip({
                    connectId: [this._botonNode],
                    label: "<b>" + this._etiqueta + "</b>" + "<br>" + "<p> " + this._msgToolTip + "</p>"
                });
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
                this._botonEnable = true;
            } else {
                this._botonEnabled = false;
            }
            this.show();
        },
        _init: function () {
            this._visible();
            this.herramienta.on("can-execute-changed", lang.hitch(this, this._herramientaCanExecuteChanged));
            this._active();
            this.set("loaded", true);
            this.emit("load", {});
        },
        _herramientaCanExecuteChanged: function () {
            this._botonEnabled = !this.herramienta.canExecute;
        },
        _bBotonClick: function () {
            if (this._botonEnable) {
                this.herramienta.execute();
            }
        },
        _botonClick: function (evt) {
            if (this._botonEnable) {
                this.herramienta.execute();
                    this.emit("dibujo-complete", evt);
            }
        }
    });
    return widget;
});
