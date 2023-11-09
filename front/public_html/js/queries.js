$(document).ready(function () {
    toastr.options = {
        "hideDuration": "500",
        "timeOut": "3000",
    };

    var queryString = window.location.search;
    var urlParams = new URLSearchParams(queryString);
    var source = urlParams.get('source');
    console.log("SOURCE QUERY: ", source);

    var container = document.getElementById("json-editor");
    var options = {};
    var editor = new JSONEditor(container, options);

    let url = '/api/queries';
    if (source !== null) {
        url = `/api/queries?source=${source}`;
    }

    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        success: function (queries) {

            let countTestRows = 0;
            let countCorrectTestRows = 0;

            for (var i = 0; i < queries.length; i++) {
                if (queries[i].source.includes("test")) {
                    countTestRows++;

                    if (queries[i].is_correct == true) {
                        countCorrectTestRows++;
                    }
                }
            }
            console.log("countTestRows: ", countTestRows);
            console.log("countCorrectTestRows: ", countCorrectTestRows);

            $("#testTotalCount").text(`Test total count: ${countTestRows}`).css("font-weight", "bold");
            $("#testCorrectCount").text(`Test correct count: ${countCorrectTestRows}`).css("font-weight", "bold");


            $('#queriesTable thead th').css('background-color', "#1C1C1C");
            $('#queriesTable thead th').css('color', "white");

            $.fn.dataTable.ext.errMode = 'none';

            $('#example').on('error.dt', function (e, settings, techNote, message) {
                console.log('An error has been reported by DataTables: ', message);
            }).DataTable();



            var queriesTable = $('#queriesTable').DataTable({
                "pageLength": 25,
                data: queries,
                columns: [
                    { title: 'idSession', data: 'idSession' },
                    { title: 'Question', data: 'request' },
                    { title: 'Response', data: 'response' },
                    { title: 'Source', data: 'source' },
                    {
                        title: 'IsCorrect', render: function (data, type, row) {
                            return '<input type="checkbox" class="form-check-input check-is-correct" ' + (row.is_correct ? 'checked' : '') + '>';
                        }
                    },
                    {
                        title: 'Data', render: function (data, type, row) {
                            return '<button class="btn btn-secondary btn-sm btn-view-json"><i class="fas fa-eye"></i></button>';
                        }
                    },
                    { title: 'createdAt', data: 'createdAt' },
                    {
                        title: 'img', render: function (data, type, row) {

                            try {
                                let imgInsert = "";

                                if (row.products == null || row == null) {
                                    return "";
                                }

                                let tmpJson = JSON.parse(row.products);

                                if (Object.hasOwn(tmpJson, "products")) {
                                    tmpJson.products.forEach(product => {
                                        console.log(product)

                                        if (Object.hasOwn(product, "foundsku") && product.foundsku !== "") {
                                            const foundObject = product.found.find(obj => obj.inventorysku === product.foundsku);
                                            let currentImg = foundObject.imageUrl;
                                            console.log(foundObject);

                                            imgInsert += `<img class="img-mini" src=" ${currentImg} " alt="Imagen">`;
                                        }
                                    });

                                    return imgInsert;
                                }
                            }
                            catch (error) {
                                console.log(error);
                            }

                        }
                    },
                ],
            });

            $('#queriesTable').on('change', 'input[type="checkbox"]', function () {
                var data = queriesTable.row($(this).closest('tr')).data();
                const checkboxValue = $(this).is(':checked');

                $.ajax({
                    url: `/api/isCorrect/${data.id}`,
                    type: 'PUT',
                    data: { isCorrect: checkboxValue },
                    success: function (response) {
                        // Manejar la respuesta del servidor si la petición fue exitosa
                        toastr.success('Request updated correctly');
                    },
                    error: function (error) {
                        // Manejar la respuesta del servidor si la petición falló
                        toastr.error('Error while updating request');
                    }
                });
            });

            $('#queriesTable').on('click', '.btn-view-json', function () {
                var data = queriesTable.row($(this).closest('tr')).data();


                editor.set(JSON.parse(data.products));
                $('#myModal').modal('show');
            });
        }
    });
});