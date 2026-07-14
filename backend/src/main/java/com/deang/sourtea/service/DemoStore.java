package com.deang.sourtea.service;

import com.deang.sourtea.model.Booking;
import com.deang.sourtea.model.Content;
import com.deang.sourtea.model.Merchant;
import com.deang.sourtea.model.Order;
import com.deang.sourtea.model.Product;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
@Profile("!mysql")
public class DemoStore implements PlatformStore {
    private final AtomicLong ids = new AtomicLong(1000);
    private final List<Product> products = new ArrayList<>();
    private final List<Order> orders = new ArrayList<>();
    private final List<Booking> bookings = new ArrayList<>();
    private final List<Merchant> merchants = new ArrayList<>();
    private final List<Content> contents = new ArrayList<>();

    public DemoStore() {
        products.add(new Product(1L, 1L, "德昂古树酸茶礼盒", "酸茶礼盒", new BigDecimal("168.00"), 36, "APPROVED"));
        products.add(new Product(2L, 1L, "45天发酵酸茶体验装", "体验装", new BigDecimal("59.00"), 80, "APPROVED"));
        products.add(new Product(3L, 2L, "茶魂守护人纪念币", "文创周边", new BigDecimal("39.00"), 120, "PENDING"));
        merchants.add(new Merchant(1L, "出冬瓜酸茶工坊", "13800000000", "APPROVED"));
        merchants.add(new Merchant(2L, "茶魂文创铺", "13900000000", "PENDING"));
        contents.add(new Content(1L, "德昂族酸茶是什么", "酸茶科普", "介绍酸茶来源、微酸回甘的风味与德昂族古老茶农身份。", "PUBLISHED"));
        contents.add(new Content(2L, "杀青、揉捻与45天发酵", "制作技艺", "把复杂手工经验拆解为三步核心记忆点。", "PUBLISHED"));
        contents.add(new Content(3L, "内部编辑草稿", "平台草稿", "未发布内容不能出现在公共接口。", "DRAFT"));
    }

    public List<Product> listProducts() {
        return products.stream().filter(product -> "APPROVED".equals(product.getStatus())).toList();
    }

    public Product createProduct(Product product) {
        Product created = new Product(ids.incrementAndGet(), product.getMerchantId(), product.getName(), product.getCategory(), product.getPrice(), product.getStock(), "PENDING");
        products.add(created);
        return created;
    }

    public Optional<Product> approveProduct(Long id) {
        Optional<Product> product = products.stream().filter(item -> item.getId().equals(id)).findFirst();
        product.ifPresent(item -> item.setStatus("APPROVED"));
        return product;
    }

    public List<Merchant> listMerchants() {
        return merchants;
    }

    public Optional<Merchant> approveMerchant(Long id) {
        Optional<Merchant> merchant = merchants.stream().filter(item -> item.getId().equals(id)).findFirst();
        merchant.ifPresent(item -> item.setStatus("APPROVED"));
        return merchant;
    }

    public List<Content> listContents() {
        return contents.stream().filter(content -> "PUBLISHED".equals(content.getStatus())).toList();
    }

    public Content createContent(Content content) {
        Content created = new Content(ids.incrementAndGet(), content.getTitle(), content.getCategory(), content.getSummary(), "PUBLISHED");
        contents.add(created);
        return created;
    }

    public Order createOrder(List<Long> productIds) {
        BigDecimal total = products.stream()
            .filter(product -> productIds.contains(product.getId()))
            .map(Product::getPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        Order order = new Order(ids.incrementAndGet(), "ST" + System.currentTimeMillis(), 1L, total, "PAID", productIds);
        orders.add(order);
        return order;
    }

    public List<Order> listOrders() {
        return orders;
    }

    public Optional<Order> shipOrder(Long id) {
        Optional<Order> order = orders.stream().filter(item -> item.getId().equals(id)).findFirst();
        order.ifPresent(item -> item.setStatus("SHIPPED"));
        return order;
    }

    public Booking createBooking(LocalDate date, Integer peopleCount, String phone) {
        Booking booking = new Booking(ids.incrementAndGet(), 1L, date, peopleCount, phone, "TEA-" + ids.incrementAndGet());
        bookings.add(booking);
        return booking;
    }

    public List<Booking> listBookings() {
        return bookings;
    }

    public Optional<Booking> verifyBooking(String code) {
        Optional<Booking> booking = bookings.stream().filter(item -> item.getVerifyCode().equals(code)).findFirst();
        booking.ifPresent(item -> item.setStatus("VERIFIED"));
        return booking;
    }

    public Map<String, Object> dashboard() {
        BigDecimal revenue = orders.stream()
            .map(Order::getTotalAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return Map.of(
            "products", products.size(),
            "orders", orders.size(),
            "bookings", bookings.size(),
            "merchants", merchants.size(),
            "contents", contents.size(),
            "revenue", revenue
        );
    }
}
