/**
 * Licensed to Neo Technology under one or more contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership. Neo Technology licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You
 * may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

'use strict';

function CypherConsole(config, ready) {

    //    var CONSOLE_URL_BASE = 'http://localhost:8080/';
    var CONSOLE_URL_BASE = 'http://console-test.neo4j.org/';

    var $IFRAME = $('<iframe/>').attr('id', 'console').addClass('cypherdoc-console');
    var $IFRAME_WRAPPER = $('<div/>').attr('id', 'console-wrapper');
    var RESIZE_OUT_ICON = 'icon-resize-full';
    var RESIZE_IN_ICON = 'icon-resize-small';
    var $RESIZE_BUTTON = $('<a class="btn btn-small resize-toggle"><i class="' + RESIZE_OUT_ICON + '"></i></a>');
    var $PLAY_BUTTON = $('<a class="run-query btn btn-small btn-success" data-toggle="tooltip" title="Execute in the console." href="#"><i class="icon-play"></i></a>');
    var $EDIT_BUTTON = $('<a class="edit-query btn btn-small" data-toggle="tooltip" title="Edit in the console." href="#"><i class="icon-edit"></i></a>');

    var consolr;
    var consoleClass = 'consoleClass' in config ? config.console : 'console';
    var contentId = 'contentId' in config ? config.content : 'content';

    createConsole(ready, consoleClass, contentId);

    function createConsole(ready, elementClass, contentId) {
        var $element = $('p.' + elementClass).first();
        if ($element.length !== 1) {
            $element = $('<p/>').addClass(elementClass);
            $('#' + contentId).append($element);
        }
        $element.each(function () {
            var $context = $(this);
            addConsole($context, ready)
        });
        addPlayButtons();
    }

    function addConsole($context, ready) {
        var url = getUrl('none', 'none', '\n\nUse the play/edit buttons to run the queries!');
        var $iframe = $IFRAME.clone().attr('src', url);
        $iframe.load(function () {
            consolr = new Consolr($iframe[0].contentWindow);
            if (ready) {
                ready(consolr);
            }
        });
        $context.empty();
        var $iframeWrapper = $IFRAME_WRAPPER.clone();
        $iframeWrapper.append($iframe);
        $context.append($iframeWrapper).append('<span id="console-label" class="label">Console expanded</span>');
        $context.css('background', 'none');
        var $resizeButton = $RESIZE_BUTTON.clone().appendTo($iframeWrapper).click(function () {
            var $icon = $('i', $resizeButton);
            if ($icon.hasClass(RESIZE_OUT_ICON)) {
                $icon.removeClass(RESIZE_OUT_ICON).addClass(RESIZE_IN_ICON);
                $iframeWrapper.addClass('fixed-console');
                $context.addClass('fixed-console');
                $('div.navbar').first().css('margin-top', $iframeWrapper.height());
            }
            else {
                $icon.removeClass(RESIZE_IN_ICON).addClass(RESIZE_OUT_ICON);
                $iframeWrapper.removeClass('fixed-console');
                $context.removeClass('fixed-console');
                $('div.navbar').first().css('margin-top', 0);
            }
        });
    }

    function addPlayButtons() {
        $('div.query-wrapper').parent().append($PLAY_BUTTON.clone().click(function (event) {
                event.preventDefault();
                consolr.query([ getQueryFromButton(this) ]);
            })).append($EDIT_BUTTON.clone().click(function (event) {
                event.preventDefault();
                consolr.input(getQueryFromButton(this));
            }));
    }

    function getQueryFromButton(button) {
        return $(button).prevAll('div.query-wrapper').first().data('query');
    }

    function getUrl(database, command, message, session) {
        var url = CONSOLE_URL_BASE;

        if (session !== undefined) {
            url += ';jsessionid=' + session;
        }
        url += '?';
        if (database !== undefined) {
            url += 'init=' + encodeURIComponent(database);
        }
        if (command !== undefined) {
            url += '&query=' + encodeURIComponent(command);
        }
        if (message !== undefined) {
            url += '&message=' + encodeURIComponent(message);
        }
        if (window.neo4jVersion != undefined) {
            url += '&version=' + encodeURIComponent(neo4jVersion);
        }
        return url + '&no_root=true';
    }
}

function Consolr(consoleWindow) {
    window.addEventListener('message', receiver, false);
    var receivers = [];

    function init(params, success, error, data) {
        var index = 0;
        if (success || error) {
            receivers.push(new ResultReceiver(success, error));
            index = receivers.length;
        }
        consoleWindow.postMessage(JSON.stringify({
            'action': 'init',
            'data': params,
            'call_id': index
        }), "*");
    }

    function query(queries, success, error) {
        var index = 0;
        if (success || error) {
            receivers.push(new ResultReceiver(success, error, queries.length));
            index = receivers.length;
        }
        var message = JSON.stringify({
            'action': 'query',
            'data': queries,
            'call_id': index
        });
        consoleWindow.postMessage(message, '*');
    }

    function input(query) {
        consoleWindow.postMessage(JSON.stringify({
            'action': 'input',
            'data': [ query ]
        }), '*');
    }

    function receiver(event) {
        var result = JSON.parse(event.data);
        if ('call_id' in result) {
            var rr = receivers[result.call_id - 1];
            rr(result);
        }
    }

    function ResultReceiver(successFunc, errorFunc, numberOfResults) {
        var expectedResults = numberOfResults || 1;

        function call(result) {
            if (expectedResults === 0) {
                console.log('Unexpected result', result);
                return;
            }
            expectedResults--;
            var resultNo = numberOfResults - expectedResults - 1;
            return result.error ? errorFunc(result, resultNo) : successFunc(result, resultNo);
        }

        return call;
    }

    return {
        'init': init,
        'query': query,
        'input': input
    };
}