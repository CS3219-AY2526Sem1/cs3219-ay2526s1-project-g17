import { useState } from "react";
import nodemailer from 'nodemailer';

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  console.log("Loc 1")
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'zachery.schiller86@ethereal.email',
      pass: 'w53pnjgC4VdWvgJTWJ'
    }
  });

  const submit = async (e) => {
    console.log("Loc 2")
    e.preventDefault();
    // await fetch("/auth/password/forgot", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ email }),
    // });
    // setSent(true);
    const info = await transporter.sendMail({
      from: '"Zachery Schiller" <zachery.schiller86@ethereal.email>',
      to: "agarwalrahul1008@gmail.com",
      subject: "Hello World",
      text: "Hello World",
      html: "<b>Hello world?</b>",
    })
    console.log("message sent: ", info.messageId);
    console.log("Loc 3")
  };

  return sent ? (
    <p>Check your email for the code.</p>
  ) : (
    <form onSubmit={submit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <button type="submit">Send code</button>
    </form>
  );
}