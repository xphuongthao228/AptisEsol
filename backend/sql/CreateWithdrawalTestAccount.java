import java.nio.file.*;
import java.sql.*;
import java.util.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

// One-time local fixture. Never connects to a remote database.
class CreateWithdrawalTestAccount {
  static long insert(Connection c, String sql, Object... values) throws Exception {
    try (var s = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
      for (int i = 0; i < values.length; i++) s.setObject(i + 1, values[i]);
      s.executeUpdate();
      try (var keys = s.getGeneratedKeys()) { keys.next(); return keys.getLong(1); }
    }
  }
  public static void main(String[] args) throws Exception {
    var env = new HashMap<String,String>();
    if (Files.exists(Path.of(".env"))) for (String line : Files.readAllLines(Path.of(".env"))) {
      line = line.trim(); int eq = line.indexOf('=');
      if (!line.startsWith("#") && eq > 0) {
        String value = line.substring(eq + 1).trim();
        if (value.length() > 1 && ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'")))) value = value.substring(1,value.length()-1);
        env.put(line.substring(0,eq).trim(),value);
      }
    }
    for (String key : List.of("DB_URL","DB_USERNAME","DB_PASSWORD")) if (System.getenv(key) != null) env.put(key,System.getenv(key));
    String url = env.getOrDefault("DB_URL","jdbc:mysql://localhost:3306/aptis_esol?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh");
    if (!url.matches("jdbc:mysql://(localhost|127\\.0\\.0\\.1):3306/aptis_esol(\\?.*)?")) throw new IllegalStateException("Only local aptis_esol database is allowed");
    String email = "withdraw.test." + System.currentTimeMillis() + "@example.com";
    String password = "TestRut@" + UUID.randomUUID().toString().substring(0,8);
    String hash = new BCryptPasswordEncoder().encode(password);
    try (var c = DriverManager.getConnection(url,env.getOrDefault("DB_USERNAME","root"),env.getOrDefault("DB_PASSWORD","demo123"))) {
      c.setAutoCommit(false);
      try {
        long user = insert(c,"INSERT INTO users (email,password,full_name,enabled,email_verified,created_at,updated_at) VALUES (?,?,?,true,true,NOW(),NOW())",email,hash,"Withdrawal Test 75000");
        long buyer = insert(c,"INSERT INTO users (email,password,full_name,enabled,email_verified,created_at,updated_at) VALUES (?,?,?,false,true,NOW(),NOW())","buyer."+email,hash,"TEST fixture buyer");
        try (var s=c.prepareStatement("INSERT INTO user_roles (user_id,role_id) SELECT ?,id FROM roles WHERE name='STUDENT'")) { s.setLong(1,user); if(s.executeUpdate()!=1) throw new IllegalStateException("Missing STUDENT role"); }
        long order = insert(c,"INSERT INTO payment_orders (user_id,package_label,days,amount,original_amount,payment_code,status,paid_at,referrer_id,referral_rewarded,created_at,updated_at) VALUES (?,'TEST ONLY - withdrawal fixture',0,1500000,1500000,?,'PAID',NOW(),?,true,NOW(),NOW())",buyer,"TEST-WITHDRAW-"+user,user);
        insert(c,"INSERT INTO referral_commissions (payment_order_id,referrer_id,base_amount,rate_percent,amount,created_at,updated_at) VALUES (?,?,1500000,5,75000,NOW(),NOW())",order,user);
        try(var s=c.prepareStatement("SELECT COALESCE(SUM(amount),0) FROM referral_commissions WHERE referrer_id=?")) { s.setLong(1,user); try(var r=s.executeQuery()) {r.next(); if(r.getLong(1)!=75000) throw new IllegalStateException("Balance verification failed");}}
        c.commit();
        System.out.println("Email: "+email+"\nPassword: "+password+"\nVerified local commission balance: 75000 VND");
      } catch (Exception e) { c.rollback(); throw e; }
    }
  }
}
