function testQueries()
{
    $.ajax({
        type: "GET",
        url: window.location.protocol+"//" + window.location.host + "/runtest",
        data: { },
        success: (data) => {
           
            console.log(data);
            $('#load').hide();
            $('#json').empty();
            var container = document.getElementById("json");
            var options = {};
            var editor = new JSONEditor(container, options);
            editor.set(data);
        },
        error: (err) => {
            //alert('fail');
            console.log(err);
            $("#testButton").prop("disabled", false);
        }
    });
}

function askQuestion(text) {
    console.log(text);
    $.ajax({
        type: "GET",
        url: window.location.protocol+"//" + window.location.host + "/ask",
        data: { question: text },
        success: (data) => {
            $('#json').empty();
            var container = document.getElementById("json");
            var options = {};
            var editor = new JSONEditor(container, options);
            editor.set(data.location);
           /* $('#guideddescription').text(data.location.guideddescription);
            $('#inventorysection').text(data.location.inventorysection);
            $('#inventorybrand').text(data.location.inventorybrand);
            $('#inventorysku').text(data.location.inventorysku);
            $('#inventoryproduct').text(data.location.inventoryproduct);
            $('#inventoryshortname').text(data.location.inventoryshortname);
            $('#inventoryalternativesku').text(data.location.inventoryalternativesku);
            $('#inventoryalternative').text(data.location.inventoryalternative);
            $('#inventoryaltshortname').text(data.location.inventoryaltshortname);*/

  

            //$('#location').text(data.location.inventorysection);
            $('#load').hide();
            $("#askButton").prop("disabled", false);

        },
        error: (err) => {
            //alert('fail');
            console.log(err);
            $("#askButton").prop("disabled", false);
        }
    });
}

function evalAnswer(eval, question, answer) {
    console.log("Evaluating answer");

    $.ajax({
        type: "GET",
        url:  window.location.protocol+"//" + window.location.host + "/eval",
        data: { evaluation: eval, question: question, answer: answer },
        success: (data) => {
            console.log(data);


        },
        error: (err) => {
            alert('fail');
        }
    });
}

$(document).ready(function () {

    $('#load').hide();
    $('#askButton').click(function () {
        console.log('Ask click');
        

        const text = $('#inputText').val();
        if (text != "" && text !== undefined)
        {
            $('#load').show();
            $('#location').text('Searching!');
            $("#askButton").prop("disabled", true);
            askQuestion(text);
        }
      

    });
    $('#testButton').click(function () {
        console.log('Test click');
        Swal.fire({
            title: 'Are you sure?',
            text: "Running all queries will take several minutes depending on the file size",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes!'
          }).then((result) => {
            if (result.isConfirmed) {
    
                $('#load').show();
                $('#location').text('Searching!');
                $("#testButton").prop("disabled", true);
                testQueries();
              //Swal.fire('Restarting!!');
    
            }
          })


    });
    

    $('#good').click(function () {
        console.log('Eval good click');
        const question = $('#inputText').val();
        const answer = $('#location').text();
        if (question != "" && question !== undefined && answer!="" && answer!==undefined)
            evalAnswer(true, question, answer);

    });

    $('#bad').click(function () {
        console.log('Eval bad click');
        const question = $('#inputText').val();
        const answer = $('#location').text();
        if (question != "" && question !== undefined && answer!="" && answer!==undefined)
            evalAnswer(false, question, answer);

    });


    // $("#record").on("click", function () {

    //     console.log("RECORDING?: ", $(this).data('recording'));
    //     if($(this).data('recording'))
    //     {
    //         console.log("Recording");
    //         rec.stop();
    //         $(this).data('recording', false);
    //         $(this).removeClass("btn-danger");
    //         $(this).addClass("btn-primary");
    //         $(this).text("Record");
    //     }
    //     else
    //     {
    //         console.log('Stoping');
    //         audioChunks = [];
    //         rec.start();
    //         $(this).data('recording', true);
    //         $(this).addClass("btn-danger");
    //         $(this).removeClass("btn-primary");
    //         $(this).text("Stop");
    //     }
    // });
});

/*
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => { handlerFunction(stream) })*/


// function handlerFunction(stream) {
//     rec = new MediaRecorder(stream);
//     rec.ondataavailable = e => {
//         audioChunks.push(e.data);
//         if (rec.state == "inactive") {
//             let blob = new Blob(audioChunks, { type: 'audio/mpeg-3' });
//             recordedAudio.src = URL.createObjectURL(blob);
//             recordedAudio.controls = true;
//             recordedAudio.autoplay = true;
//             sendAudioData(blob);
//         }
//     }
// }
// function sendAudioData(blob) {

//     let fd = new FormData();
//     fd.append("file", blob);
//     $.ajax({
//         type: "POST",
//         url: "//" + window.location.host + "/uploadAudio",
//         data: fd,
//         contentType: false,
//         processData: false,
//         success: (data) => {
//             console.log(data);


//         },
//         error: (err) => {
//             alert('fail');
//         }
//     });
// }

