function run_python() {
    selected_text = editor.session.getTextRange(editor.getSelectionRange());
    input_arguments = document.getElementById("input_arguments").value;
    connect_error = '';
    var hint;
    if (hint_glow !== undefined && hint_glow !== null) {
        clearInterval(hint_glow);
    }
    if (selected_text.length > 0) {
        editor_val = selected_text;
    } else {
        editor_val = editor.getValue();
    }
    if (editor_val.trim() === '') {
        $('#run-btn').blur();
        toastr.info('Нельзя запустить пустой код', 'INFO');
    } else {
        prev_result = 'in';
        document.getElementById("hint-section").innerHTML = '';
        editor_list = $(".nav-tabs").children('li');
        code_contents = [];
        active_filename = '';
        for (let i = 0; i < editor_list.length - 1; i++) {
            editor_index = parseInt($(editor_list[i]).attr('id').split('-')[1]);
            code_content = {}
            code_content['code'] = editor_session[editor_index - 1].getValue();
            code_content['file_name'] = $(editor_list[i]).children('a')[0].innerText;
            if ($(editor_list[i]).hasClass('active')) {
                active_filename = code_content['file_name'];
            }
            code_contents.push(code_content);
        }
        active_file_name = active_editor_id.html();
        document.getElementById("download_file_name").value = active_file_name.replace(/\..*/g, '').toLowerCase() + '_output.txt';
        init_ts = performance.now();
        if (typeof socket !== "undefined") {
            socket.close();
        }
        output.innerHTML = '';
        progress_status.innerHTML = '';
        $('#output').append('<div class="wrapper" id="wrap"></div><form id="term-form"><input id="term-input" autocomplete="off"></form>');
        exec_detail.innerHTML = '<span class="label label-primary"><i class="fas fa-sync-alt fa-spin"></i>&ensp;Устанавливается соединение с сервером</span>';
        progress_status.innerHTML = '<div class="progress" id="progress-bar"><div class="progress-bar progress-bar-primary progress-bar-striped active" role="progressbar"></div></div>';
        document.getElementById('control-btn').innerHTML = '<button type="button" class="btn btn-danger btn-sm" id="stop-btn" onclick="stop_python()"><i class="fa fa-stop"></i>&ensp;<strong>Остановить</strong></button>';
        $('#stop-btn').removeAttr('disabled');
        $('.status button').attr('disabled', 'disabled');
        $('#terminal-ad').css('display', 'none');
        $('#output').css('display', 'block');
        document.getElementById('wrap').innerHTML = '';
        socket_options['query'] = {
            type: "script",
            "lang": "python3"
        };
        socket = io(repl_host, socket_options);
        socket.emit('code', code_contents, input_arguments.substring(0, 500), active_filename);
        socket.on('reconnecting', function() {
            console.log('Переподключение к серверу!');
        });
        socket.on('connect', function() {
            console.log('Пользователь подключился к серверу');
        });
        socket.on('exit', function(data, code) {
            add_content(data);
            final_ts = Math.floor(performance.now() - init_ts) / 1000;
            if (code == 0) {
                exe_cnt += 1;
                progress_status.innerHTML = '<div class="progress" id="progress-bar"><div class="progress-bar progress-bar-success active" role="progressbar"></div></div>';
            } else if (code == 1000) {
                progress_status.innerHTML = '<div class="progress" id="progress-bar"><div class="progress-bar progress-bar-warning active" role="progressbar"></div></div>';
            } else {
                progress_status.innerHTML = '<div class="progress" id="progress-bar"><div class="progress-bar progress-bar-danger active" role="progressbar"></div></div>';
            }
            document.getElementById('control-btn').innerHTML = '<button type="button" class="btn btn-success btn-sm" id="run-btn" onclick="run_python()"><i class="fa fa-play"></i>&ensp;<strong>Запустить</strong></button>';
            $('#run-btn').removeAttr('disabled');
            $('.status button').removeAttr('disabled');
            if (hint !== undefined) {
                document.getElementById("hint-section").innerHTML = '<a tabindex="0" type="button" id="hint-btn" data-toggle="popover" data-placement="right" data-trigger="hover" data-content="' + hint + '" title="Hint" class="btn btn-default btn-sm status"><i class="fas fa-lightbulb"></i></button></a>';
                $("#hint-btn").popover('show');
                setTimeout(function() {
                    $("#hint-btn").popover('hide')
                }, 7000);
                hint_glow = setInterval(function() {
                    if ($("#hint-btn").css('transform').search('1.5') !== -1) {
                        $("#hint-btn").css('transform', 'scale(1.2)')
                    } else {
                        $("#hint-btn").css('transform', 'scale(1.5)')
                    }
                }, 700);
            }
            add_content('\nНажмите Enter для выхода');
            $(document).ready(function() {
                $('#term-input').focus();
                $('#term-form').submit(function(event) {
                    clear_output();
                    return false;
                });
            });
        })
        socket.on('output', function(data) {
            var encodedString = String.fromCharCode.apply(null, new Uint8Array(data));
            var buf = decodeURIComponent(escape(encodedString));
            add_content(buf, true);
        });
        socket.on('input', function(data) {
            var encodedString = String.fromCharCode.apply(null, new Uint8Array(data));
            var buf = decodeURIComponent(escape(encodedString));
            add_input_content(buf, true);
        });
        socket.on('err', function(data) {
            var encodedString = String.fromCharCode.apply(null, new Uint8Array(data));
            var buf = decodeURIComponent(escape(encodedString));
            add_err(buf);
            if (hint === undefined)
                hint = check_hint(buf);
        });
        socket.on('reconnect_failed', function(err) {
            console.log("Пересоединение прервано");
            clear_content();
            add_content("Problem in connecting to the server. Below could be the possible reasons:\n", true);
            add_content("  -  Your Page can be unresponsive. Please reload your page and try.\n", true);
            add_content("  -  Your Internet might be down. Check your internet connection.\n", true);
            add_content("  -  Server may not be reachable and could be under maintenence. Please try after sometime.\n", true);
            document.getElementById('control-btn').innerHTML = '<button type="button" class="btn btn-success btn-sm" id="run-btn" onclick="run_python()" id="#run"><i class="fa fa-play"></i>&ensp;<strong>Run</strong></button>';
            $('#run-btn').removeAttr('disabled');
            $('.status button').removeAttr('disabled');
            socket.close();
        });
        socket.on('connect_error', function(err) {
            console.log("Соединение прервано - " + err);
            connect_error = err;
        });
        $(document).ready(function() {
            $('#term-form').submit(function(event) {
                var input = $('#term-input');
                socket.send(input.val());
                return false;
            });
            var scrolledWindow = $('body').height() - $(window).height() + 0
            $(window).scrollTop(scrolledWindow);
            $('#term-input').focus();
        });
    }
}
function stop_python() {
    document.getElementById('progress-status').innerHTML = '';
    if (typeof socket !== "undefined") {
        socket.close();
    }
    final_ts = Math.floor(performance.now() - init_ts) / 1000;
    progress_status.innerHTML = '<div class="progress" id="progress-bar"><div class="progress-bar progress-bar-warning active" role="progressbar"></div></div>';
    exec_detail.innerHTML = '<span class="label label-warning"><i class="fa fa-exclamation-triangle"></i>&ensp;Прервано</span>';
    document.getElementById('control-btn').innerHTML = '<button type="button" class="btn btn-success btn-sm" id="run-btn" onclick="run_python()" id="#run"><i class="fa fa-play"></i>&ensp;<strong>Запустить</strong></button>';
    $('#run-btn').removeAttr('disabled');
    $('.status button').removeAttr('disabled');
    add_err("\n** Процесс остановлен **");
    add_content('\nНажммите Enter чтобы выйти');
    $(document).ready(function() {
        $('#term-input').focus();
        $('#term-form').submit(function(event) {
            clear_output();
            return false;
        });
    });
}
function update_editor_footer() {
    pos = editor.session.selection.getCursor();
    row = pos["row"] + 1;
    column = pos["column"] + 1;
    selected_char = editor.session.getTextRange(editor.getSelectionRange()).length;
    if (selected_char > 0) {
        y.innerHTML = "&emsp;Ln: " + row + ",&ensp;Col: " + column + "&nbsp;(" + selected_char + " selected)"
    } else {
        y.innerHTML = "&emsp;Ln: " + row + ",&ensp;Col: " + column
    }
}
function clear_output() {
    socket.close();
    document.getElementById('progress-status').innerHTML = '';
    output.innerHTML = '';
    progress_status.innerHTML = '';
    exec_detail.innerHTML = '';
    editor.focus();
    if (display_flag)
        $('#terminal-ad').css('display', 'inline-block');
    $('#output').css('display', 'none');
    $('#run-btn').removeAttr('disabled');
    $('#stop-btn').attr('disabled', 'disabled');
    $('.status button').removeAttr('disabled');
    $('.status button').attr('disabled', 'disabled');
    $('.status button').tooltip('hide');
}
function copy_output() {
    $('.status').blur();
    result = document.getElementById("pre");
    element_id = "pre";
    if (result === undefined || result === null) {
        result = document.getElementById("wrap");
        element_id = "wrap";
    }
    if (result) {
        var copyText = '';
        divChildren = document.getElementById(element_id).childNodes;
        for (var i = 0; i < divChildren.length; i++) {
            copyText += divChildren[i].innerText;
        }
        const textArea = document.createElement('textarea');
        textArea.setAttribute("id", "hidden_textarea");
        textArea.textContent = copyText;
        document.body.append(textArea);
        textArea.select();
        document.execCommand("copy");
        toastr.success('Результат был скопирован', 'INFO');
    }
}
function download_output() {
    result = document.getElementById("pre");
    element_id = "pre";
    if (result === undefined || result === null) {
        result = document.getElementById("wrap");
        element_id = "wrap";
    }
    filename = document.getElementById("download_file_name").value;
    if (result) {
        var copyText = '';
        divChildren = document.getElementById(element_id).childNodes;
        for (var i = 0; i < divChildren.length; i++) {
            copyText += divChildren[i].innerText;
        }
        const textArea = document.createElement('textarea');
        textArea.setAttribute("id", "hidden_textarea");
        textArea.textContent = copyText;
        document.body.append(textArea);
        textArea.select();
        if (textArea.value !== '') {
            download(textArea.value, filename, "text/txt");
        } else {
            toastr.info('Нельзя скачать пустой файл', 'INFO');
        }
    }
}
function download_code() {
    filename = document.getElementById("code_file_name").value;
    if (editor.getValue() !== '') {
        const copyText = editor.getValue();
        const textArea = document.createElement('textarea');
        textArea.setAttribute("id", "hidden_textarea");
        textArea.textContent = copyText;
        document.body.append(textArea);
        textArea.select();
        if (textArea.value !== '') {
            download(textArea.value, filename, "text/txt");
        }
    } else {
        toastr.info('Код отсутствует', 'INFO');
    }
}
function download(content, filename, contentType) {
    if (!contentType)
        contentType = 'application/octet-stream';
    var a = document.createElement('a');
    var blob = new Blob([content],{
        'type': contentType
    });
    a.href = window.URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}
function updateVal(currentEle, value) {
    $(document).off('click');
    $('.add-editor').attr('disabled', 'disabled');
    $(currentEle).html('<input class="thVal" type="text" value="' + value + '" />');
    $(".thVal").focus();
    $(".thVal").keyup(function(event) {
        event.stopPropagation();
        event.preventDefault();
        if (event.keyCode == 13) {
            filenames = get_filenames();
            input_filename = $(".thVal").val();
            if (input_filename !== '' && input_filename !== undefined && input_filename !== null && filenames.indexOf(input_filename) < 0)
                $(currentEle).html(input_filename.replace(/[^0-9A-Za-z-_\.]/g, ''));
            else
                $(currentEle).html(value);
            if (filenames.indexOf(input_filename) >= 0) {
                toastr.info(input_filename + ' уже используется. Пожалуйста выберите другое имя файла.', 'INFO');
            }
            editor.focus();
            $(document).off('click');
            $('.add-editor').removeAttr('disabled');
        }
    });
    $(document).click(function(e) {
        e.stopPropagation();
        e.preventDefault();
        if ($(event.target).attr('class') != "thVal") {
            filenames = get_filenames();
            input_filename = $(".thVal").val();
            if (input_filename !== '' && input_filename !== undefined && input_filename !== null && filenames.indexOf(input_filename) < 0)
                $(currentEle).html(input_filename.replace(/[^0-9A-Za-z-_\.]/g, ''));
            else
                $(currentEle).html(value);
            if (filenames.indexOf(input_filename) >= 0) {
                toastr.info(input_filename + ' уже используется. Пожалуйста выберите другое имя файла.', 'INFO');
            }
            editor.focus();
            $(document).off('click');
            $('.add-editor').removeAttr('disabled');
        }
    });
}
function close_editor_tab() {
    close_tab.prev().children('a').click();
    close_tab.remove();
    editor_index -= 1;
    editor.focus();
}
function save_code_modal() {
    $('#save_file').blur();
    if (active_editor_id.html().search('<input') === -1) {
        if (editor.getValue().trim() === '') {
            toastr.info('Code is empty to save', 'INFO');
        } else {
            active_file_name = active_editor_id.html();
            document.getElementById("code_file_name").value = active_file_name.replace(/\..*/g, '').toLowerCase() + '.py';
            $("#saveEditorTab").modal('show');
        }
    }
}
function download_modal() {
    $("#downloadResult").modal('show');
}
function dispFile(contents) {
    editor_cnt += 1;
    editor_index += 1;
    var id = editor_cnt;
    active_editor = id;
    editor_session[active_editor - 1] = ace.createEditSession('', "ace/mode/python");
    editor.setSession(editor_session[active_editor - 1]);
    $('.add-editor').closest('li').before('<li id="editor-' + id + '"><a data-toggle="tab">' + open_file_name + '</a> <span> <i class="fa fa-times"></i></span></li>');
    active_editor_id = $(".nav-tabs li").children('a').last();
    active_editor_id.tab('show');
    editor.session.setValue(contents);
    editor.focus();
    update_editor_footer();
    editor.selection.on('changeCursor', function(e) {
        update_editor_footer();
    });
    editor.selection.on('changeSelection', function(e) {
        update_editor_footer();
    });
}
function clickElem(elem) {
    var eventMouse = document.createEvent("MouseEvents")
    eventMouse.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    elem.dispatchEvent(eventMouse)
}
function start_terminal() {
    $('#start-term').tooltip('hide');
    if (typeof socket !== "undefined") {
        document.getElementById('control-btn').innerHTML = '<button type="button" class="btn btn-success btn-sm" id="run-btn" onclick="run_python()" id="#run"><i class="fa fa-play"></i>&ensp;<strong>Запустить</strong></button>';
        $('#run-btn').removeAttr('disabled');
        $('.status button').removeAttr('disabled');
        socket.close();
    }
    output.innerHTML = '<div class="wrapper" id="wrap"></div><form id="term-form"><input id="term-input" autocomplete="off"></form>';
    $('#output').css('display', 'block');
    input_arguments = document.getElementById("input_arguments").value;
    socket_options['query'] = {
        type: "shell"
    };
    socket = io(repl_host, socket_options);
    exec_detail.innerHTML = '<span class="label label-primary"><i class="fas fa-sync-alt fa-spin"></i>&ensp;Подключение к серверу</span>';
    socket.on('connect', function() {
        console.log('Пользователь подключился к серверу!');
        clear_content();
    });
    socket.on('reconnecting', function() {
        console.log('Переподключение к серверу!');
    });
    socket.on('exit', function(data, code) {
        shell_add_content(data);
        shell_add_content('\nНажмите Enter для выхода из терминала');
        $(document).ready(function() {
            $('#term-input').focus();
            $('#term-form').submit(function(event) {
                clear_output();
                return false;
            });
        });
    })
    socket.on('output', function(data) {
        var buf = String.fromCharCode.apply(null, new Uint8Array(data));
        shell_add_content(buf);
    });
    socket.on('err', function(data) {
        var buf = String.fromCharCode.apply(null, new Uint8Array(data));
        shell_add_err(buf);
    });
    socket.on('reconnect_failed', function() {
        console.log("Connection Failed");
        exec_detail.innerHTML = '';
        shell_add_content("Проблемы соединения с сервером. Возможные причины:");
        shell_add_content("  -  Ваша страница была загружена с ошибкой. Пожалуйста обновите её и порпобуйте ещё раз.");
        shell_add_content("  -  Ваше интернет-соединение пропало. Проверьте свой интернет.");
        shell_add_content("  -  Возникли проблемы на сервере. Пожалуйста попробуйте позже.");
    });
    $(document).ready(function() {
        $("#term-form").keyup(function(event) {
            if (event.keyCode == 38) {
                if (command_index === 0) {
                    beep();
                }
                if (command_index === command_list.length) {
                    cur_cmd = $('#term-input').val();
                }
                command_index = command_index > 0 ? command_index - 1 : command_index;
                if (command_list.length > 0) {
                    document.getElementById("term-input").value = command_list[command_index];
                }
            }
            if (event.keyCode == 40) {
                if (command_index === command_list.length) {
                    beep();
                }
                if (command_index === command_list.length) {
                    cur_cmd = $('#term-input').val();
                }
                command_index = command_index < command_list.length ? command_index + 1 : command_index;
                if (command_index === command_list.length) {
                    document.getElementById("term-input").value = cur_cmd;
                } else {
                    document.getElementById("term-input").value = command_list[command_index];
                }
            }
        });
        $('#term-form').submit(function(event) {
            var input = $('#term-input');
            socket.send(input.val());
            if (input.val().trim() !== "" && input.val().trim() !== command_list[command_list.length - 1]) {
                command_list.push(input.val());
            }
            command_index = command_list.length;
            return false;
        });
        $('#term-input').focus();
    });
}
function add_content(bashOutput, focus) {
    bashOutput = $('<div>').text(bashOutput).html();
    $('.wrapper').append('<p id="term-output">' + bashOutput + '</p>');
    document.getElementById('term-form').innerHTML = '<input id="term-input" autocomplete="off">';
    if (focus) {
        $('#term-input').focus();
    }
    var scrolledWindow = $('body').height() - $(window).height() + 0;
    $(window).scrollTop(scrolledWindow);
    if (bashOutput !== '' && bashOutput.slice(-1) !== "\n")
        prev_result = 'out';
}
function add_input_content(bashOutput, focus) {
    if (prev_result === 'in') {
        bashOutput = bashOutput.replace(/^\n/, '');
    }
    bashOutput = $('<div>').text(bashOutput).html();
    $('.wrapper').append('<p id="term-output">' + bashOutput + '</p>');
    document.getElementById('term-form').innerHTML = '<input id="term-input" autocomplete="off">';
    if (focus) {
        $('#term-input').focus();
    }
    var scrolledWindow = $('body').height() - $(window).height() + 0;
    $(window).scrollTop(scrolledWindow);
    prev_result = 'in';
}
function clear_content() {
    progress_status.innerHTML = '';
    document.getElementById('wrap').innerHTML = '';
    exec_detail.innerHTML = '';
    $('#run-btn').removeAttr('disabled');
    $('#stop-btn').attr('disabled', 'disabled');
    $('.status button').removeAttr('disabled');
}
function add_err(bashError) {
    cur = bashError.slice(-4);
    if (cur === '>>> ' || cur === '... ') {
        bashError = bashError.slice(0, -4);
    } else {
        cur = ""
    }
    bashError = $('<div>').text(bashError).html();
    bashError_list = bashError.split("\n");
    document.getElementById('term-form').innerHTML = cur + '<input id="term-input" autocomplete="off">';
    for (i = 0; i < bashError_list.length; i++) {
        if (bashError_list[i].trim() === "") {
            continue;
        }
        if (bashError_list[i].slice(0, 6) === 'Python' || bashError_list[i].slice(0, 4) === 'Type' || bashError_list[i].slice(0, 4) === '[GCC') {
            $('.wrapper').append('<p id="term-output">' + bashError_list[i] + '\n</p>');
        } else if (bashError_list[i].search('Error:') !== -1) {
            $('.wrapper').append('<p id="term-output" class="error">' + bashError_list[i] + '\n</p>');
        } else {
            $('.wrapper').append('<p id="term-output" class="warning">' + bashError_list[i] + '\n</p>');
        }
    }
    var scrolledWindow = $('body').height() - $(window).height() + 0
    $(window).scrollTop(scrolledWindow);
    $('#term-input').focus();
}
function shell_add_content(bashOutput) {
    bashOutput = $('<div>').text(bashOutput).html();
    $('.wrapper').append('<p id="shell-output">' + bashOutput + '</p>');
    document.getElementById('term-form').innerHTML = '<input id="term-input" autocomplete="off">';
    $('#term-input').focus();
    var scrolledWindow = $('body').height() - $(window).height() + 0
    $(window).scrollTop(scrolledWindow);
}
function shell_add_err(bashError) {
    cur = bashError.slice(-4);
    if (cur === '>>> ' || cur === '... ') {
        bashError = bashError.slice(0, -4);
    } else {
        cur = ""
    }
    bashError = $('<div>').text(bashError).html();
    bashError_list = bashError.split("\n");
    document.getElementById('term-form').innerHTML = cur + '<input id="term-input" autocomplete="off">';
    for (i = 0; i < bashError_list.length; i++) {
        if (bashError_list[i].slice(0, 6) === 'Python' || bashError_list[i].slice(0, 4) === 'Type' || bashError_list[i].slice(0, 4) === '[GCC') {
            $('.wrapper').append('<p id="shell-output">' + bashError_list[i] + '</p>');
        } else if (bashError_list[i].search('Error:') !== -1) {
            $('.wrapper').append('<p id="shell-output" class="error">' + bashError_list[i] + '</p>');
        } else {
            $('.wrapper').append('<p id="shell-output" class="warning">' + bashError_list[i] + '</p>');
        }
    }
    var scrolledWindow = $('body').height() - $(window).height() + 0
    $(window).scrollTop(scrolledWindow);
    $('#term-input').focus();
}
function get_filenames() {
    editor_list = $(".nav-tabs").children('li');
    filenames = []
    for (let i = 0; i < editor_list.length - 1; i++) {
        filenames.push($(editor_list[i]).children('a')[0].innerText);
    }
    return filenames;
}
function get_host() {
    return "https://repl.online-cpp.com";
}
function check_hint(err_text) {
    if (err_text.search('ModuleNotFoundError') !== -1) {
        hint = "Запустите команду - help('modules') для поиска возможных используемых модулей";
    } else {
        hint = undefined;
    }
    return hint;
}