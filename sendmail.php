<?php
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Debugging: Enable error reporting
    // error_reporting(E_ALL);
    // ini_set('display_errors', 1);
    
    if (!isset($_POST['g-recaptcha-response']) || empty($_POST['g-recaptcha-response'])) {
        echo "Please verify captcha.";
        exit;
    }

    $secretKey = "#"; 
    $captchaResponse = $_POST['g-recaptcha-response'];
    $userIP = $_SERVER['REMOTE_ADDR'];

    $verifyURL = "https://www.google.com/recaptcha/api/siteverify";
    $response = file_get_contents(
        $verifyURL . "?secret=" . $secretKey . "&response=" . $captchaResponse . "&remoteip=" . $userIP
    );
    $responseData = json_decode($response);

    if (!$responseData->success) {
        echo "Captcha verification failed.";
        exit;
    }

    $to = "sujithcwd@gmail.com"; // Replace with your email address
        $subject = "Ayuluxir - Contact ";

    // Collect form inputs
     $name = htmlspecialchars($_POST['name']);
     $phone = htmlspecialchars($_POST['phone']);
    $email = htmlspecialchars($_POST['email']);
    $message = htmlspecialchars($_POST['message']);

    // Basic validation
    // if (empty($papertype) || empty($printcolor)) {
    //     die("All fields are required. Please go back and complete the form.");
    // }

    // Build the email body
    $body ="<h1 style='color:#28276e;'>Valueguru Contact Form</h1>";
    $body .="<table border='1' cellspacing='0' cellpadding='8' style='border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;'>";
    $body .= "<tr><td><strong>Name:</strong></td><td> $name\n</td></tr>";
    $body .= "<tr><td><strong>Phone:</strong></td><td> $phone\n</td></tr>";
    $body .= "<tr><td><strong>Email:</strong></td><td> $email\n</td></tr>";
    $body .= "<tr><td><strong>Upload Resume:</strong></td><td> $message\n</td></tr>";
    $body .="</table>";
    
    
    

    // Handle the file upload
    $hasAttachment = isset($_FILES['attachment']) && $_FILES['attachment']['error'] == UPLOAD_ERR_OK;

    if ($hasAttachment) {
        $file_tmp = $_FILES['attachment']['tmp_name'];
        $file_name = $_FILES['attachment']['name'];
        $file_type = mime_content_type($file_tmp);
        $file_size = $_FILES['attachment']['size'];

        // Debugging: Log file details
        // echo "File Name: $file_name<br>";
        // echo "File Type: $file_type<br>";
        // echo "File Size: $file_size bytes<br>";

        // Limit file size (e.g., 2MB)
        if ($file_size > 10 * 1024 * 1024) {
            die("File size exceeds 10MB limit.");
        }

        // Read and encode the file content
        $file_content = chunk_split(base64_encode(file_get_contents($file_tmp)));
        $boundary = md5(uniqid(time()));

        // Email headers with attachment
        $headers  = "From: sujithcwd@gmail.com\r\n";
        $headers .= "Reply-To: sujithcwd@gmail.com\r\n";
 
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

        // Email body with attachment
        $email_body  = "--$boundary\r\n";
        $email_body .= "Content-Type: text/html; charset=\"UTF-8\"\r\n";
        $email_body .= "Content-Transfer-Encoding: 7bit\r\n";
        $email_body .= "\r\n";
        $email_body .= $body . "\r\n";
        $email_body .= "--$boundary\r\n";
        $email_body .= "Content-Type: $file_type; name=\"$file_name\"\r\n";
        $email_body .= "Content-Disposition: attachment; filename=\"$file_name\"\r\n";
        $email_body .= "Content-Transfer-Encoding: base64\r\n";
        $email_body .= "\r\n";
        $email_body .= $file_content . "\r\n";
        $email_body .= "--$boundary--\r\n";
    } else {
        // Email headers without attachment
        $headers  = "From: sujithcwd@gmail.com\r\n";
        $headers .= "Reply-To: sujithcwd@gmail.com\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=\"UTF-8\"\r\n";

        $email_body = $body;
    }

    // Debugging: Log email details
    // echo "<pre>Email Details:\n";
   //echo "To: $to\r\n";
    // echo "Subject: $subject\n";
    // echo "Headers: $headers\n";
    // echo "Body: $body\n</pre>";

    // Send the email
    if (mail($to, $subject, $email_body, $headers)) {
        echo "Email sent successfully!";
    } else {
        echo "Failed to send email. Please check your server configuration.";
    }
}
?>
