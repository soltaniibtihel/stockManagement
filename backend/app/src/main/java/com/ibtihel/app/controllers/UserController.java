package com.ibtihel.app.controllers;


import com.ibtihel.app.entities.User;
import com.ibtihel.app.services.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
//@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    public UserController(UserService userService) {
        this.userService = userService;
    }

    // ADMIN creates users
    @PostMapping
    //@PreAuthorize("hasRole('ADMIN')")
    public User createUser(@RequestBody User user) {
        return userService.createUser(user);
    }

    // DIRECTOR can see all profiles
    @GetMapping
    //@PreAuthorize("hasRole('DIRECTOR')")
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    // Each user can see his own profile
    @GetMapping("/{id}")
    //@PreAuthorize("#id == authentication.principal.id or hasRole('DIRECTOR')")
    public User getUserById(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    // User updates his own profile
    @PutMapping("/{id}")
    //@PreAuthorize("#id == authentication.principal.id or hasRole('ADMIN')")
    public User updateUser(@PathVariable Long id, @RequestBody User user) {
        return userService.updateUser(id, user);
    }

    // ADMIN deletes user
    @DeleteMapping("/{id}")
   // @PreAuthorize("hasRole('ADMIN')")
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }

}
