# Database migrations

`init.sql` đã chứa schema mới cho database được tạo từ đầu. Với database đã có
dữ liệu, hãy sao lưu trước rồi chạy các migration theo thứ tự tên file bằng một
tài khoản có quyền `ALTER`.

Migration bảo mật đầu tiên:

```powershell
docker compose up -d mysql
Get-Content -Raw .\migrations\001_security_hardening.sql |
  docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

Migration sẽ dừng nếu dữ liệu hiện tại vi phạm một trong các ràng buộc mới. Có
thể kiểm tra trước bằng các truy vấn chỉ đọc sau:

```sql
SELECT property_id, owner_id, COUNT(*)
FROM featured_orders
WHERE status = 'pending'
GROUP BY property_id, owner_id
HAVING COUNT(*) > 1;

SELECT property_id, `order`, COUNT(*)
FROM property_images
GROUP BY property_id, `order`
HAVING COUNT(*) > 1;

SELECT property_id, buyer_id, COUNT(*)
FROM contacts
GROUP BY property_id, buyer_id
HAVING COUNT(*) > 1;
```

Hãy xử lý thủ công các bản ghi trùng sau khi sao lưu rồi chạy lại migration;
script không tự động xóa dữ liệu người dùng.
