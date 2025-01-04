// Config
let filepath = 'content'

// Document loading
$(document).ready( function () {
    $.when( api('get', 'content.json') ).done(function(content) {
        let body = $('body');
        $.each(content, function(date, entry) {
            body.append(
                $('<div/>', { class:'item' }).append(
                    $('<div/>', { class:'title' }).text(`~ ${entry.title}`),
                    $('<div/>', { class:'wrapper' }).append(
                        $('<div/>', { class:'content' }).text(entry.content),
                        $('<img/>', { class:'image', src:`${filepath}/${entry.image}`})
                    ),
                    $('<div/>', { class:'date' }).text(date)
                )
            );
        });
    });
});

// API call for ObStack with Token
function api(httpmethod, path, data) {
  let xhr = $.ajax({
    url: `${filepath}/${path}`,
    type: httpmethod,
    data: JSON.stringify(data),
    error: function (response) { },
    success: function (response, status, xhr) { }
  });
  return xhr;
}