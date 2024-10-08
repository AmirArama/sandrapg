class S3Manager {

    constructor() {
        
        this.bucketList = [];  // Store the list of buckets
        this.selectedBucket = null;  // Member variable to store the selected bucket
        this.accumulatedFiles = {};  // Dictionary to store selected files by bucket

        this.init();
    }

    // Initialize the S3Manager by calling listBuckets via AJAX
    init() {
        console.log('Initializing S3 Manager...');
        this.listBuckets();
    }

    // Perform an AJAX call to list the buckets from the backend
    listBuckets() {
        $.ajax({
            url: '/list_buckets',
            type: 'GET',
            success: (response) => {
                this.bucketList = response.buckets; 
                //console.log('Buckets in prop:', this.bucketList);  // Log the filled bucket list
                // Clear the bucket list before appending new items
                $('#bucket-list').empty();

                // Append each bucket as a list item with a radio button
                response.buckets.forEach(bucket => {
                    $('#bucket-list').append(
                        `<li class="list-group-item" id="bucket-${bucket}" style="font-size: 1.7rem;">
                            <input type="radio" name="bucket" value="${bucket}" class="mr-2 bucket-radio" style="transform: scale(1.5);"> 
                            ${bucket}
                         </li>`
                    );
                });

                // Set up the event listener to update the selected bucket
                this.setupRadioButtonListener();
            },
            error: function(error) {
                console.error('Error fetching bucket list:', error);
            }
        });
    }

    // Set up event listener to track which bucket is selected
    setupRadioButtonListener() {
        // Use an arrow function to maintain the context of 'this'
        $('.bucket-radio').change((event) => {
            // Update the selectedBucket property with the selected bucket's value
            this.selectedBucket = $(event.target).val();
            console.log('Selected bucket:', this.selectedBucket);  // Log the selected bucket

            // Now that we have the selected bucket, list its files
            this.listFiles();
        });
    }


    // Method to list files in the selected bucket
    listFiles() {
        const selectedBucket = this.selectedBucket;

        if (!selectedBucket) {
            console.log('First load - No bucket selected.');
            return;
        }

        //console.log(`Listing files in bucket: ${this.selectedBucket}`);

        $.ajax({
            url: '/list_files',
            type: 'GET',
            data: { bucket: selectedBucket },  // Send the selected bucket as a query parameter
            success: (response) => {
                // Clear the file list before appending new files
                $('#file-list').empty();

                if (response.files && response.files.length > 0) {
                    response.files.forEach(file => {
                        $('#file-list').append(`
                            <li class="list-group-item" style="font-size: 1.7rem;">
                                <input type="checkbox" class="file-checkbox" value="${file}" style="transform: scale(1.5);">
                                ${file}
                            </li>
                        `);
                    });
                } else {
                    $('#file-list').append(`<li class="list-group-item">No files found in bucket</li>`);
                }
            },
            error: (error) => {
                console.error(`Error listing files in bucket ${selectedBucket}:`, error);
            }
        });
    }

    // Method to get the currently selected bucket
    getSelectedBucket() {
        return this.selectedBucket;
    }

    // Function to get the selected files (checked checkboxes)
    getSelectedFiles() {
        let selectedFiles = [];

        $('.file-checkbox:checked').each(function() {
            selectedFiles.push($(this).val());  // Add file name to array
        });

        return selectedFiles;
    }

    // Method to create a new bucket
    createBucket(bucketName) {
        console.log(`Creating a new bucket: ${bucketName}`);
        
        $.ajax({
            url: '/create_bucket',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ bucket_name: bucketName }),
            success: (response) => {
                console.log(`Bucket ${bucketName} created successfully.`);
                this.listBuckets();  // Refresh the bucket list after creation
            },
            error: (error) => {
                console.error(`Error creating bucket: ${bucketName}`, error);
            }
        });
    }

    // Method to delete a bucket
    deleteBucket(bucketName) {
        console.log(`Deleting bucket: ${bucketName}`);
        
        $.ajax({
            url: '/delete_bucket',
            type: 'DELETE',
            contentType: 'application/json',
            data: JSON.stringify({ bucket_name: bucketName }),
            success: (response) => {
                console.log(`Bucket ${bucketName} deleted successfully.`);

                // Reset the selected bucket after deletion
                if (bucketName === this.selectedBucket) {
                    this.selectedBucket = null;  // Clear the private selected bucket
                }


                this.listBuckets();  // Refresh the bucket list after deletion
            },
            error: (error) => {
                console.error(`Error deleting bucket: ${bucketName}`, error);
            }
        });
    }

    // Method to delete selected files from the currently selected bucket
    deleteSelectedFiles() {
        const selectedBucket = this.getSelectedBucket();
        const selectedFiles = this.getSelectedFiles();  // Use getSelectedFiles() to get the selected files

        console.log("going to delete files in: ", selectedBucket);
        console.log("files :" , selectedFiles);

        if (!selectedBucket) {
            console.log("No bucket selected.");
            return;
        }

        if (selectedFiles.length === 0) {
            console.log("No files selected for deletion.");
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete the selected files from bucket: ${selectedBucket}?`);

        if (confirmed) {
            $.ajax({
                url: '/delete_files',
                type: 'DELETE',
                contentType: 'application/json',
                data: JSON.stringify({
                    bucket_name: selectedBucket,
                    files: selectedFiles  // Pass the selected files to the backend
                }),
                success: (response) => {
                    console.log(`Files deleted successfully from ${selectedBucket}.`);

                    // Refresh the file list after successful deletion
                    this.listFiles();
                },
                error: (error) => {
                    console.error(`Error deleting files from bucket ${selectedBucket}:`, error);
                }
            });
        }
    }


    // Method to upload files to the selected bucket
    uploadFiles(files) {
        const selectedBucket = this.getSelectedBucket();

        if (!selectedBucket) {
            alert("No bucket selected.");
            return;
        }

        if (files.length === 0) {
            alert("No files selected for upload.");
            return;
        }

        const formData = new FormData();
        formData.append('bucket_name', selectedBucket);

        // Append the files to the form data
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        $.ajax({
            url: '/upload_files',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            success: (response) => {
                console.log(`Files uploaded successfully to ${selectedBucket}.`);

                // Refresh the file list after successful upload
                this.listFiles();
            },
            error: (error) => {
                console.error(`Error uploading files to bucket ${selectedBucket}:`, error);
            }
        });
    }

    // Method to generate and handle pre-signed URLs for downloading files
    downloadFiles(selectedBucket, selectedFiles) {
        // Check if a bucket and files are selected
        if (!selectedBucket) {
            alert("No bucket selected.");
            return;
        }

        if (selectedFiles.length === 0) {
            alert("No files selected for download.");
            return;
        }

        console.log("Downloading the following files:", selectedFiles);
        console.log("From bucket:", selectedBucket);

        // Send request to backend to generate pre-signed URLs for the selected files
        $.ajax({
            url: '/generate_presigned_url',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ bucket_name: selectedBucket, files: selectedFiles }),
            success: (response) => {
                console.log("Received pre-signed URLs:", response.presigned_urls);  // Log the received URLs
                if (response.presigned_urls && response.presigned_urls.length > 0) {
                    this.downloadFilesSequentially(response.presigned_urls);  // Trigger file download
                } else {
                    alert("No pre-signed URLs generated.");
                }
            },
            error: (error) => {
                console.error("Error generating pre-signed URLs:", error);
            }
        });
    }

    // Helper method to trigger file download using pre-signed URL with a delay
    downloadFilesSequentially(presignedUrls) {
        let delay = 500;  // 500 milliseconds delay between each download

        presignedUrls.forEach((file, index) => {
            setTimeout(() => {
                const a = document.createElement('a');
                // Use the exact pre-signed URL generated by AWS without modifying it
                a.href = file.url;  // Use file.url directly, no modification
                a.download = file.file_name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);  // Clean up the DOM
                console.log(`Downloaded: ${file.file_name}`);
            }, delay * index);  // Delay each download
        });
    }

    addSelectedFiles() {
        const selectedBucket = this.getSelectedBucket();
        const selectedFiles = this.getSelectedFiles();
    
        if (!selectedBucket || selectedFiles.length === 0) {
            console.log("No bucket or files selected.");
            return;
        }
    
        if (!this.accumulatedFiles[selectedBucket]) {
            this.accumulatedFiles[selectedBucket] = [];
        }
    
        // Add new files, ensuring no duplicates
        selectedFiles.forEach(file => {
            if (!this.accumulatedFiles[selectedBucket].includes(file)) {
                this.accumulatedFiles[selectedBucket].push(file);
            }
        });
    
        console.log("Accumulated files:", this.accumulatedFiles);
    
        // Update the card showing the accumulated files
        this.updateAccumulatedFilesCard();
    }

    clearSelectedFiles(){

        this.accumulatedFiles = {}; 
        $('#accumulated-files-list').empty();  // Clears all <li> elements from the list
        // Update the card showing the accumulated files
        this.updateAccumulatedFilesCard();
    }
    
    updateAccumulatedFilesCard() {
        $('#accumulated-files-list').empty();  // Clear the existing list
    
        // Iterate over accumulated files and display each file with a checkbox
        for (const [bucket, files] of Object.entries(this.accumulatedFiles)) {
            $('#accumulated-files-list').append(`<h5 style="font-size: 1.7rem;">Bucket: ${bucket}</h5>`);
    
            files.forEach(file => {
                $('#accumulated-files-list').append(`
                    <li class="list-group-item" style="font-size: 1.7rem;">
                        <input type="checkbox" class="accumulated-file-checkbox" value="${file}" style="transform: scale(1.5); margin-right: 10px;">
                        ${file}
                    </li>
                `);
            });
        }
    }
    

}


