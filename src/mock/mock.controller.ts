import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

@Controller('mock')
export class MockController {
  @Get('login')
  getLoginPage() {
    return `<!DOCTYPE html>
<html>
  <head><title>Mock Login</title></head>
  <body>
    <h1>Mock Portal Login</h1>
    <form method="POST" action="/mock/login">
      <label>Username</label>
      <input name="ctl00$MainContent$UserName" id="ctl00_MainContent_UserName" />
      <label>Password</label>
      <input name="ctl00$MainContent$Password" id="ctl00_MainContent_Password" type="password" />
      <button type="submit" id="ctl00_MainContent_LoginButton">Sign in</button>
    </form>
  </body>
</html>`;
  }

  @Post('login')
  postLogin(
    @Body('ctl00$MainContent$UserName') username: string,
    @Body('ctl00$MainContent$Password') password: string,
    @Res() response: Response
  ) {
    if (!username || !password) {
      return response.status(401).send('Invalid credentials');
    }

    response.cookie('mock_session', '1', {
      httpOnly: true,
      sameSite: 'lax'
    });

    return response.redirect('/mock/shipments');
  }

  @Get('shipments')
  getShipments(@Req() request: Request, @Res() response: Response) {
    if (request.cookies.mock_session !== '1') {
      return response.redirect('/mock/login');
    }

    return response.send(`<!DOCTYPE html>
<html>
  <head><title>Mock Shipments</title></head>
  <body>
    <h1>Shipments Grid</h1>
    <table id="ctl00_MainContent_ShipmentsGrid" border="1">
      <thead>
        <tr><th>externalId</th><th>title</th><th>status</th></tr>
      </thead>
      <tbody>
        <tr><td>T-001</td><td>First Shipment</td><td>READY</td></tr>
        <tr><td>T-002</td><td>Second Shipment</td><td>IN_PROGRESS</td></tr>
        <tr><td>T-003</td><td>Third Shipment</td><td>DONE</td></tr>
      </tbody>
    </table>
  </body>
</html>`);
  }
}
