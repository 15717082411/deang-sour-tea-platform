package com.deang.sourtea.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.deang.sourtea.mapper.BookingMapper;
import com.deang.sourtea.mapper.ContentMapper;
import com.deang.sourtea.mapper.MerchantMapper;
import com.deang.sourtea.mapper.OrderMapper;
import com.deang.sourtea.mapper.ProductMapper;
import com.deang.sourtea.model.Booking;
import com.deang.sourtea.model.Content;
import com.deang.sourtea.model.Merchant;
import com.deang.sourtea.model.Order;
import com.deang.sourtea.model.Product;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Profile("mysql")
public class MybatisPlatformStore implements PlatformStore {
    private final ProductMapper productMapper;
    private final MerchantMapper merchantMapper;
    private final ContentMapper contentMapper;
    private final OrderMapper orderMapper;
    private final BookingMapper bookingMapper;

    public MybatisPlatformStore(
        ProductMapper productMapper,
        MerchantMapper merchantMapper,
        ContentMapper contentMapper,
        OrderMapper orderMapper,
        BookingMapper bookingMapper
    ) {
        this.productMapper = productMapper;
        this.merchantMapper = merchantMapper;
        this.contentMapper = contentMapper;
        this.orderMapper = orderMapper;
        this.bookingMapper = bookingMapper;
    }

    public List<Product> listProducts() {
        return productMapper.selectList(new QueryWrapper<Product>().eq("status", "APPROVED"));
    }

    public Product createProduct(Product product) {
        product.setStatus("PENDING");
        productMapper.insert(product);
        return product;
    }

    public Optional<Product> approveProduct(Long id) {
        Product product = productMapper.selectById(id);
        if (product == null) return Optional.empty();
        product.setStatus("APPROVED");
        productMapper.updateById(product);
        return Optional.of(product);
    }

    public List<Merchant> listMerchants() {
        return merchantMapper.selectList(null);
    }

    public Optional<Merchant> approveMerchant(Long id) {
        Merchant merchant = merchantMapper.selectById(id);
        if (merchant == null) return Optional.empty();
        merchant.setStatus("APPROVED");
        merchantMapper.updateById(merchant);
        return Optional.of(merchant);
    }

    public List<Content> listContents() {
        return contentMapper.selectList(new QueryWrapper<Content>().eq("status", "PUBLISHED"));
    }

    public Content createContent(Content content) {
        content.setStatus("PUBLISHED");
        contentMapper.insert(content);
        return content;
    }

    @Transactional
    public Order createOrder(List<Long> productIds) {
        List<Product> products = productMapper.selectBatchIds(productIds);
        BigDecimal total = products.stream()
            .map(Product::getPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        products.forEach(product -> {
            product.setStock(Math.max(0, product.getStock() - 1));
            productMapper.updateById(product);
        });
        Order order = new Order(null, "ST" + System.currentTimeMillis(), 1L, total, "PAID", productIds);
        orderMapper.insert(order);
        return order;
    }

    public List<Order> listOrders() {
        return orderMapper.selectList(null);
    }

    public Optional<Order> shipOrder(Long id) {
        Order order = orderMapper.selectById(id);
        if (order == null) return Optional.empty();
        order.setStatus("SHIPPED");
        orderMapper.updateById(order);
        return Optional.of(order);
    }

    public Booking createBooking(LocalDate date, Integer peopleCount, String phone) {
        Booking booking = new Booking(null, 1L, date, peopleCount, phone, "TEA-" + System.currentTimeMillis());
        bookingMapper.insert(booking);
        return booking;
    }

    public List<Booking> listBookings() {
        return bookingMapper.selectList(null);
    }

    public Optional<Booking> verifyBooking(String code) {
        Booking booking = bookingMapper.selectOne(new QueryWrapper<Booking>().eq("verify_code", code));
        if (booking == null) return Optional.empty();
        booking.setStatus("VERIFIED");
        bookingMapper.updateById(booking);
        return Optional.of(booking);
    }

    public Map<String, Object> dashboard() {
        Map<String, Object> data = new HashMap<>();
        data.put("products", productMapper.selectCount(null));
        data.put("orders", orderMapper.selectCount(null));
        data.put("bookings", bookingMapper.selectCount(null));
        data.put("merchants", merchantMapper.selectCount(null));
        data.put("contents", contentMapper.selectCount(null));
        data.put("revenue", orderMapper.selectList(null).stream()
            .map(Order::getTotalAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add));
        return data;
    }
}
