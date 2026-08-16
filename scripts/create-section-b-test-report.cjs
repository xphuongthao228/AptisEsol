const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'reports');
const outputPath = path.join(outputDir, 'Bao-cao-Functional-Correctness-Data-Confidentiality.doc');

fs.mkdirSync(outputDir, { recursive: true });

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Báo cáo test case - Phần B</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1f2937; line-height: 1.45; }
    h1 { font-size: 22pt; color: #1f4e79; margin: 0 0 6px; }
    h2 { font-size: 16pt; color: #1f4e79; margin: 22px 0 8px; border-bottom: 1px solid #d9e2f3; padding-bottom: 4px; }
    h3 { font-size: 13pt; color: #2f5597; margin: 18px 0 6px; }
    h4 { font-size: 11pt; margin: 12px 0 4px; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0 16px; }
    th, td { border: 1px solid #d9e2f3; padding: 7px 9px; vertical-align: top; }
    th { background: #eef3f8; color: #1f4e79; font-weight: bold; }
    .subtitle { font-size: 14pt; color: #2f5597; font-weight: bold; margin-bottom: 10px; }
    .meta { margin: 4px 0; }
    .rule { background: #fff7ed; border: 1px solid #fed7aa; padding: 8px 10px; margin: 8px 0 14px; }
    .placeholder { color: #64748b; }
  </style>
</head>
<body>
  <h1>BÁO CÁO TEST CASE</h1>
  <div class="subtitle">PHẦN B – Functional Correctness &amp; Data Confidentiality (3 TC)</div>
  <p class="meta"><strong>Người chọn phần:</strong> ____________________</p>

  <h2>1. Thông Tin Chung</h2>
  <table>
    <tr><th>Hạng mục</th><th>Nội dung</th></tr>
    <tr><td>Phạm vi kiểm thử</td><td>Functional Correctness &amp; Data Confidentiality</td></tr>
    <tr><td>Số test case</td><td>03</td></tr>
    <tr><td>Đối tượng kiểm thử</td><td>API lấy câu hỏi/đáp án, API submission, API đọc submission</td></tr>
    <tr><td>Chuẩn chất lượng áp dụng</td><td>ISO/IEC 25010</td></tr>
    <tr><td>Mục tiêu</td><td>Kiểm chứng tính đúng đắn chức năng và bảo mật dữ liệu theo quyền người dùng.</td></tr>
  </table>

  <h2>2. Traceability Matrix</h2>
  <table>
    <tr>
      <th>Test Case</th>
      <th>Requirement SRS</th>
      <th>ISO/IEC 25010</th>
      <th>Evidence</th>
      <th>Mục tiêu kiểm chứng</th>
    </tr>
    <tr>
      <td>TC-Q-001</td>
      <td>NFR-SEC-05 (DERIVED)</td>
      <td>Security – Confidentiality</td>
      <td>EV-API-002</td>
      <td>Không tiết lộ đáp án đúng cho STUDENT.</td>
    </tr>
    <tr>
      <td>TC-SUB-001</td>
      <td>FR-SUB-01 + FR-SUB-02 + NFR-FS-01 (DERIVED)</td>
      <td>Functional suitability – Functional correctness</td>
      <td>EV-API-003 + EV-DB-001</td>
      <td>Submission phải duy trì quan hệ Test–Question.</td>
    </tr>
    <tr>
      <td>TC-SUB-002</td>
      <td>FR-SUB-03 + NFR-SEC-04 (DERIVED)</td>
      <td>Security – Confidentiality</td>
      <td>EV-API-004</td>
      <td>Submission của STUDENT A không được tiết lộ cho STUDENT B.</td>
    </tr>
  </table>

  <h2>3. Chi Tiết Test Case</h2>

  <h3>TC-Q-001 – Không tiết lộ đáp án đúng cho STUDENT</h3>
  <p><strong>Requirement SRS:</strong> NFR-SEC-05 (DERIVED)</p>
  <p><strong>ISO/IEC 25010:</strong> Security – Confidentiality</p>
  <p><strong>Mục tiêu áp dụng ISO:</strong> dữ liệu dùng để xác định đáp án đúng không được tiết lộ cho STUDENT trước thời điểm nghiệp vụ cho phép.</p>
  <p><strong>Evidence:</strong> EV-API-002</p>
  <h4>Các bước thực thi</h4>
  <ol>
    <li>Đăng nhập bằng STUDENT hợp lệ.</li>
    <li>Gọi API lấy câu hỏi/đáp án trong luồng làm bài.</li>
    <li>Kiểm tra response từng answer để tìm <code>correct=true</code> hoặc dữ liệu tương đương có thể suy ra đáp án đúng.</li>
    <li>Lưu HTTP response vào EV-API-002.</li>
  </ol>
  <div class="rule"><strong>Quy tắc kết luận:</strong> nếu response STUDENT lộ <code>correct=true</code> thì giữ FAIL và truy vết DEF-SEC-001; giá trị của test nằm ở việc kiểm chứng Confidentiality.</div>
  <p><strong>Kết quả thực tế:</strong> <span class="placeholder">____________________</span></p>
  <p><strong>Defect liên quan:</strong> <span class="placeholder">____________________</span></p>

  <h3>TC-SUB-001 – Quan hệ Test–Question trong submission</h3>
  <p><strong>Requirement SRS:</strong> FR-SUB-01 + FR-SUB-02 + NFR-FS-01 (DERIVED)</p>
  <p><strong>ISO/IEC 25010:</strong> Functional suitability – Functional correctness</p>
  <p><strong>Mục tiêu áp dụng ISO:</strong> submission phải duy trì quan hệ Test–Question; dữ liệu sai quan hệ không được lưu.</p>
  <p><strong>Evidence:</strong> EV-API-003 + EV-DB-001</p>
  <h4>Các bước thực thi</h4>
  <ol>
    <li>Đăng nhập STUDENT.</li>
    <li>Từ dữ liệu hiện tại, chọn Test A và tìm một Question thực sự thuộc Test B, với A khác B. Không hard-code testId/questionId từ lần chạy cũ.</li>
    <li>Tạo payload submission dùng Test A nhưng Question của Test B; lưu rõ các ID và truy vấn chứng minh quan hệ trước khi gửi.</li>
    <li>Gửi request, ghi HTTP status/body.</li>
    <li>Truy vấn CSDL sau request để xác định dữ liệu sai quan hệ có được lưu hay không.</li>
    <li>Lưu API vào EV-API-003 và đối chiếu DB vào EV-DB-001.</li>
  </ol>
  <div class="rule"><strong>Quy tắc kết luận:</strong> PASS nếu hệ thống từ chối payload sai quan hệ hoặc không lưu dữ liệu sai; FAIL nếu submission chứa Question thuộc Test khác vẫn được lưu.</div>
  <p><strong>Kết quả thực tế:</strong> <span class="placeholder">____________________</span></p>
  <p><strong>Defect liên quan:</strong> <span class="placeholder">____________________</span></p>

  <h3>TC-SUB-002 – Quyền sở hữu submission</h3>
  <p><strong>Requirement SRS:</strong> FR-SUB-03 + NFR-SEC-04 (DERIVED)</p>
  <p><strong>ISO/IEC 25010:</strong> Security – Confidentiality</p>
  <p><strong>Mục tiêu áp dụng ISO:</strong> submission của STUDENT A không được tiết lộ cho STUDENT B.</p>
  <p><strong>Evidence:</strong> EV-API-004</p>
  <h4>Các bước thực thi</h4>
  <ol>
    <li>Chuẩn bị hai tài khoản STUDENT A và STUDENT B độc lập.</li>
    <li>Bằng tài khoản A, tự tạo hoặc xác định một submission hiện có và chứng minh record đó thuộc A. Không hard-code submission id 15.</li>
    <li>A đọc submission của chính mình để có positive control.</li>
    <li>Đăng nhập B và gọi API đọc đúng submission vừa xác nhận của A.</li>
    <li>Ghi HTTP status/body; lưu ownership proof, positive control A và negative control B vào EV-API-004.</li>
  </ol>
  <div class="rule"><strong>Quy tắc kết luận:</strong> nếu B đọc được nội dung submission của A thì giữ FAIL/DEF-SEC-002.</div>
  <p><strong>Kết quả thực tế:</strong> <span class="placeholder">____________________</span></p>
  <p><strong>Defect liên quan:</strong> <span class="placeholder">____________________</span></p>

  <h2>4. Evidence Checklist</h2>
  <table>
    <tr><th>Evidence ID</th><th>Nội dung cần lưu</th><th>Trạng thái</th></tr>
    <tr><td>EV-API-002</td><td>HTTP response API lấy câu hỏi/đáp án bằng STUDENT.</td><td>____________________</td></tr>
    <tr><td>EV-API-003</td><td>HTTP request/response submission sai quan hệ Test–Question.</td><td>____________________</td></tr>
    <tr><td>EV-DB-001</td><td>Truy vấn DB chứng minh quan hệ trước/sau khi gửi request.</td><td>____________________</td></tr>
    <tr><td>EV-API-004</td><td>Ownership proof, positive control A, negative control B.</td><td>____________________</td></tr>
  </table>

  <h2>5. Tổng Kết Kết Luận</h2>
  <table>
    <tr><th>Test Case</th><th>Kết quả</th><th>Ghi chú/Defect</th></tr>
    <tr><td>TC-Q-001</td><td>PASS / FAIL / BLOCKED</td><td>____________________</td></tr>
    <tr><td>TC-SUB-001</td><td>PASS / FAIL / BLOCKED</td><td>____________________</td></tr>
    <tr><td>TC-SUB-002</td><td>PASS / FAIL / BLOCKED</td><td>____________________</td></tr>
  </table>
</body>
</html>`;

fs.writeFileSync(outputPath, html, 'utf8');
console.log(outputPath);
