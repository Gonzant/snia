/*
 * js/snia/modulos/Dibujo
 * 
 */
/*global define*/
/*jslint nomen: true*/
define([
    "dojo/on",
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "esri/toolbars/draw"
], function (on, Evented, declare, lang,
    Draw) {
    "use strict";
    return declare([Evented], {
        options : {
            drawOptions: { showTooltips: false }
        },
        //privado
        _draw : null,//Draw
        _mapa : null,//MapaWidget
        //publico
        constructor : function (options) {
            //mezclar opciones usuario y default
            this.options = lang.mixin({}, this.options, options);            
        },
        /*Mapa*/
        agregarMapa : function (mapa) {
            if (this._mapa) {
                this.removerMapa();
            }
            this._mapa = mapa;
            if (this._mapa.loaded) {
                this._init();
            } else {
                on.once(this._mapa, "load", this._init);
            }
        },
        removerMapa : function () {
            if (this._mapa) {
                this._mapa = null;
            }
            if (this._mapaReloadListener) {
                this._mapaReloadListener.remove();
                this._mapaDibujoEnabledChanged.remove();
            }
        },
        activar: function (geometryType) {
            this._drawEnable = true;
            this._drawGeometryType = geometryType;
            this._mapa.set("dibujoEnable", this);
            this._draw.activate(geometryType);
        },
        desactivar: function () {
            if (this._drawEnable) {
                this._drawEnable = false;
                if (this._mapa.dibujoEnable === this) {
                    this._mapa.set("dibujoEnable", null);
                }
                this._draw.deactivate();
            }
        },
        //privadas
        _init: function () {
            this._mapaReloadListener = on(this._mapa, "reload", lang.hitch(this, this._mapaReload));
            this._mapaDibujoEnabledChanged = on(this._mapa, "dibujo-enabled-changed", lang.hitch(this, this._dibujoEnabledChanged));
            this._initDraw();
        },
        //draw
        _initDraw: function () {
            this._draw = new Draw(this._mapa.map, this.options.drawOptions);
            this._drawDrawCompleteListener = on(this._draw, "draw-complete", lang.hitch(this, this._drawDrawComplete));
        },
        _drawDrawComplete: function (evt) {
            this.emit("dibujo-complete", evt);
        },
        _dibujoEnabledChanged: function () {
            if (this._mapa.dibujoEnable !== this) {
                this.emit("dibujo-enabled-changed", {});
            }
        },
        _mapaReload: function () {
            this._initDraw();
            if (this._drawEnable) {
                this.activar(this._drawGeometryType);
            }
        }
    });
});